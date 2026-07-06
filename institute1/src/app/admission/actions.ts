'use server';

import { createClient } from '@/lib/supabase/server';

export async function submitAdmission(formData: any) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return { error: "You must be logged in to submit an admission form." };
  }

  const url = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
  
  if (!url) {
    console.error("Missing NEXT_PUBLIC_GOOGLE_SHEET_URL configuration.");
    // We can simulate success for dev testing if url is missing, but to be safe let's return an error
    return { error: "Submission API is not configured (Missing Spreadsheet URL)." };
  }
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    
    // We don't necessarily need to parse the response if it succeeds
    // Google script might redirect or return 200 text
    const text = await response.text();
    // Update local Supabase profile to hide the alert block forever
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ admission_filled: true })
      .eq('id', user.id);

    if (profileError) {
      console.error("Warning: Failed to update admission_filled in Supabase:", profileError);
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("Admission submission error:", err);
    return { error: "Failed to connect to the registration server. Please try again later." };
  }
}
