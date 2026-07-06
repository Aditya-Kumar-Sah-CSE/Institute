# Connecting the Admission Form to Google Sheets

Since the codebase already uses `fetch(process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL)` in [src/app/admission/actions.ts](file:///d:/Institute/BCE/src/app/admission/actions.ts) to transmit the form data, we can effortlessly connect this to a live Google Sheet using **Google Apps Script**.

Follow these exact steps to create a WebhookURL that will receive your form data.

## Step 1: Prepare the Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a new Blank Spreadsheet.
2. Name the spreadsheet (e.g., "Student Admissions 2026").
3. In the first row (Row 1), add your **column headers** matching the data you send from your form. (For example: `Name`, `Email`, `Phone`, `Course`, `Date`, etc.). 
*Note: Make sure the names of these columns match the JSON keys you are sending in the Next.js `formData` object.*

## Step 2: Create the Apps Script
1. In the Google Sheets menu, click **Extensions** > **Apps Script**.
2. Delete any code in the `Code.gs` file and replace it with this exact script:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Get headers from the first row to determine order
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Map the incoming JSON data to the correct columns based on headers
    var rowData = headers.map(function(header) {
      if (header === 'Timestamp' || header === 'Date') {
        return new Date(); // Automatically inject a timestamp if you have a 'Timestamp' column
      }
      return data[header] !== undefined ? data[header] : ""; 
    });
    
    // Append the new row at the bottom of the sheet
    sheet.appendRow(rowData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "error", "message": error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click the **Save** icon (💾) or press `Ctrl + S`.

## Step 3: Deploy as a Web App
1. In the top-right corner of the Apps Script editor, click the blue **Deploy** button > **New deployment**.
2. Click the **gear icon (⚙️)** next to "Select type" and choose **Web app**.
3. Fill out the configuration:
   - **Description**: Admission Form Integration
   - **Execute as**: `Me` (your Google account)
   - **Who has access**: `Anyone` *(Critical: This must be "Anyone" so your Next.js server can POST to it without requiring Google Login).*
4. Click **Deploy**.
5. Google will prompt you to **Authorize access**. Follow the prompts, choose your Google account, click "Advanced", and click "Go to Untitled project (unsafe)". Allow the permissions.
6. Once deployed, you will be given a **Web app URL**. Copy this URL.

## Step 4: Link to Your Project
1. Open your [.env.local](file:///d:/Institute/BCE/.env.local) file in both `BCE` and `Institute1` projects.
2. Add the copied URL to your environment variables:
   
```bash
NEXT_PUBLIC_GOOGLE_SHEET_URL="https://script.google.com/macros/s/YOUR_UNIQUE_ID/exec"
```
3. Restart your Next.js development server (`npm run dev`) for the environment variables to take effect.

## Step 5: Test the Integration
1. Fill out the Admission form in the browser and submit it.
2. The [submitAdmission()](file:///d:/Institute/BCE/src/app/admission/actions.ts#5-47) server action will trigger, send a POST request to your Google Script, update the user's `admission_filled` status in Supabase, and a new row should instantly appear in your Google Sheet!

> [!TIP]
> Do not rename your column headers in Google Sheets once they are set up, as the script relies on the header names to map incoming JSON fields to the correct columns. If you add a new input field to your React form, simply add a column header with the exact same name to the end of the Google Sheet.
