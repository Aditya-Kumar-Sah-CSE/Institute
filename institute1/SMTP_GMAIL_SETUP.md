# How to Setup Personal Gmail for Supabase SMTP

To use your personal Gmail account for sending authentication emails (like sign-ups, password resets) in Supabase, you must generate an **App Password**. Google does not allow direct login with your normal password for third-party SMTP servers due to security reasons.

Follow these steps carefully:

## Step 1: Turn on 2-Step Verification
*(If you already have 2-Step Verification turned on, you can skip to Step 2)*

1. Open your browser and go to [myaccount.google.com/security](https://myaccount.google.com/security).
2. Scroll down to the **"How you sign in to Google"** section.
3. Click on **"2-Step Verification"**.
4. Follow the on-screen prompts to add your phone number and turn it ON.

## Step 2: Generate an App Password
1. On the same Security page, scroll down or use the search bar at the top to search for **"App passwords"**.
*(Note: It is usually located at the very bottom of the 2-Step Verification page).*
2. You may be asked to enter your Gmail password again to verify it's you.
3. You will see a dropdown labeled "Select app". Choose **'Other'** (or 'Custom') and type **"Supabase"** as the name.
4. Click the **"Generate"** button.
5. A popup will appear with a **16-character password** inside a yellow box. 
6. **Copy this password** (make sure there are no spaces). Save it somewhere safe because you will not be able to view it again once you close the popup.

## Step 3: Configure SMTP in Supabase
Now, go to your Supabase project dashboard:

1. Go to **Project Settings** (the Gear icon ⚙️) -> **Authentication** -> **SMTP**.
2. Turn ON the **"Enable Custom SMTP"** toggle.
3. Fill in the following details exactly as shown:
   - **Host:** `smtp.gmail.com`
   - **Port:** `465` (or `587`)
   - **User:** `your-personal-email@gmail.com` (Your Gmail address)
   - **Password:** The **16-character App Password** you copied in Step 2 (ensure there are no spaces).
   - **Sender email:** `your-personal-email@gmail.com` (Your Gmail address)
   - **Sender name:** The name you want users to see (e.g., `Institute Admin`).
4. Click **Save**.

## Step 4: Test the Configuration
1. Scroll down to the bottom of the SMTP settings section in Supabase.
2. Enter an alternative email address in the **"Send test email"** input field.
3. Click send and check if the email arrives in the inbox.

Once this is working, all your Supabase Auth emails will be routed through your Gmail account, completely bypassing Supabase's default rate limits.
