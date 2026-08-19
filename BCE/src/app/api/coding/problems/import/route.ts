import { NextResponse } from 'next/server';
import { getCodeArenaActor, slugifyProblem } from '@/features/code-arena/server';
import { fetchExternalProblem, validateAndNormalizeInput } from '@/lib/coding-platforms';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required to import problems.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { input, platform: platformHint } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Problem ID or URL string is required.' } },
        { status: 400 }
      );
    }

    // 1. Validate & normalize input with SSRF protection
    let identifier;
    try {
      identifier = validateAndNormalizeInput(input, platformHint);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_IDENTIFIER', message: err.message || 'Invalid problem ID or URL.' } },
        { status: 400 }
      );
    }

    const externalPlatform = identifier.platform;
    let externalProblemId = identifier.rawInput;
    if (identifier.platform === 'CODEFORCES' && identifier.contestId && identifier.problemIndex) {
      externalProblemId = `${identifier.contestId}${identifier.problemIndex}`;
    } else if (identifier.platform === 'LEETCODE' && identifier.slug) {
      externalProblemId = identifier.slug;
    }

    // 2. Check Database Cache First
    const { data: cachedProblem } = await supabase
      .from('coding_problems')
      .select('id, title, slug, description, difficulty, tags, constraints, input_format, output_format, explanation, source_type, external_platform, external_problem_id, external_url, time_limit_ms, memory_limit_mb, supported_languages, signature, starter_code, examples, hints, follow_up, is_premium, metadata')
      .eq('external_platform', externalPlatform)
      .eq('external_problem_id', externalProblemId)
      .maybeSingle();

    if (cachedProblem) {
      // Fetch sample test cases for cached problem
      const { data: samples } = await supabase
        .from('coding_problem_test_cases')
        .select('id, input, expected_output, is_hidden, sample_name, order_index')
        .eq('problem_id', cachedProblem.id)
        .eq('is_hidden', false)
        .order('order_index', { ascending: true });

      const isLc = cachedProblem.source_type === 'LEETCODE' || cachedProblem.external_platform === 'LEETCODE';
      const isIncomplete =
        !cachedProblem.description ||
        cachedProblem.description.includes('Solve Codeforces Problem') ||
        cachedProblem.description.includes('Solve LeetCode Problem') ||
        (samples || []).length === 0 ||
        (isLc && (!cachedProblem.starter_code || Object.keys(cachedProblem.starter_code || {}).length === 0));

      if (!isIncomplete) {
        return NextResponse.json({
          success: true,
          data: {
            problem: cachedProblem,
            testCases: samples || [],
            isCached: true,
          },
        });
      }
      console.log(`[CODE ARENA IMPORT Cache Incomplete for ${externalPlatform}:${externalProblemId}] - Re-fetching full problem payload...`);
    }

    // 3. Cache Miss: Fetch from external platform via adapter
    let externalProblem;
    try {
      externalProblem = await fetchExternalProblem(input, platformHint);
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: `Could not fetch this ${externalPlatform} problem: ${err.message || 'External server unavailable'}`,
          },
        },
        { status: 502 }
      );
    }

    // 4. Save/Upsert into Database
    const baseSlug = slugifyProblem(`${externalProblem.platform}-${externalProblem.externalId}-${externalProblem.title}`);
    
    // Conflict-safe insertion or fetch existing if race condition occurred
    const { data: insertedProblem, error: insertError } = await supabase
      .from('coding_problems')
      .upsert(
        {
          title: externalProblem.title,
          slug: baseSlug,
          description: externalProblem.statement,
          difficulty: externalProblem.difficulty,
          tags: externalProblem.tags,
          constraints: externalProblem.constraints || null,
          input_format: externalProblem.inputFormat || null,
          output_format: externalProblem.outputFormat || null,
          explanation: externalProblem.explanation || null,
          time_limit_ms: 2000,
          memory_limit_mb: 256,
          supported_languages: ['cpp17', 'c', 'java', 'python', 'javascript'],
          source_type: externalProblem.platform,
          external_platform: externalProblem.platform,
          external_problem_id: externalProblem.externalId,
          external_url: externalProblem.officialUrl,
          is_published: true,
          created_by: user.id,
          signature: externalProblem.signature || null,
          starter_code: externalProblem.starterCode || {},
          examples: externalProblem.examples || [],
          hints: externalProblem.hints || [],
          follow_up: externalProblem.followUp || null,
          is_premium: !!externalProblem.isPremium,
          metadata: externalProblem.metadata || {},
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'external_platform,external_problem_id' }
      )
      .select()
      .single();

    if (insertError) {
      console.error('[CODE ARENA IMPORT DB ERROR]', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: `Failed to save problem into database: ${insertError.message}`,
            details: insertError.details || insertError.hint || null,
          },
        },
        { status: 500 }
      );
    }

    // 5. Save Public Sample Test Cases
    const testCasesToInsert = (externalProblem.examples || []).map((example, idx) => ({
      problem_id: insertedProblem.id,
      input: example.input,
      expected_output: example.output,
      is_hidden: false,
      sample_name: `Sample ${idx + 1}`,
      order_index: idx,
    }));

    let savedSamples: any[] = [];
    if (testCasesToInsert.length > 0) {
      const { data: samplesData, error: samplesError } = await supabase
        .from('coding_problem_test_cases')
        .insert(testCasesToInsert)
        .select();

      if (samplesError) {
        console.error('[CODE ARENA SAMPLE TESTCASES DB ERROR]', samplesError);
      }
      savedSamples = samplesData || [];
    }

    return NextResponse.json({
      success: true,
      data: {
        problem: insertedProblem,
        testCases: savedSamples,
        isCached: false,
      },
    });
  } catch (err: any) {
    console.error('Import route unhandled error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
