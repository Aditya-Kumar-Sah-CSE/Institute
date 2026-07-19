const fs = require('fs');
const path = require('path');

const migrationsDir = 'd:\\Institute\\institute1\\supabase\\migrations';
const targetFiles = [
    '001_create_tables.sql', '002_rls_policies.sql', '018_instructor_submissions_rls.sql',
    '020_add_institute_id.sql', '038_add_grad_to_handle_new_user.sql',
    '028_monthly_rewards.sql', '043_fix_monthly_rewards.sql', '044_fix_monthly_rewards_global.sql', '045_fix_monthly_rewards_date.sql',
    '041_doubt_likes.sql', '048_fix_doubt_likes_trigger.sql',
    '031_doubts_system.sql', '050_course_specific_doubts.sql',
    '071_chat_and_status.sql', '072_advanced_chat_system.sql', '072_ephemeral_stories.sql', '073_add_image_to_stories.sql'
];

let output = '';

for (const file of targetFiles) {
    const fullPath = path.join(migrationsDir, file);
    if (fs.existsSync(fullPath)) {
        output += `\n\n==================== ${file} ====================\n`;
        output += fs.readFileSync(fullPath, 'utf8');
    }
}

fs.writeFileSync('d:\\Institute\\institute1\\duplicate_contents.txt', output);
console.log('Extraction complete');
