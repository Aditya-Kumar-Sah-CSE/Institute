/**
 * PASTING INSTRUCTIONS FOR GOOGLE SHEETS:
 * 1. Open your Google Sheet
 * 2. Click Extensions > Apps Script
 * 3. Delete any code in the editor and paste ALL of this code.
 * 4. Click the "Deploy" button (top right) > "New deployment"
 * 5. Type: "Web app"
 * 6. Under Execute as: choose "Me (your email)"
 * 7. Under Who has access: choose "Anyone"
 * 8. Click "Deploy". It will ask for permissions. Authorize it.
 * 9. Copy the long "Web app URL" and paste it in your BCE/.env.local as:
 *    NEXT_PUBLIC_GOOGLE_SHEET_URL=https://script.google.com/macros/s/xyz/exec
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Create the row array exactly matching your headers:
    var row = [
      new Date(), // Timestamp
      data.firstName || '',
      data.middleName || '',
      data.lastName || '',
      data.gender || '',
      data.mobile || '',
      data.email || '',
      data.branch || '',
      data.rollNumber || '',
      data.fatherName || '',
      data.fatherMobile || '',
      data.motherName || '',
      data.motherMobile || '',
      data.board10 || '',
      data.year10 || '',
      data.marks10 || '',
      data.total10 || '',
      data.percent10 || '',
      data.board12 || '',
      data.year12 || '',
      data.marks12 || '',
      data.total12 || '',
      data.percent12 || '',
      data.hostel || '',
      data.declaration ? 'Yes' : 'No'
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// OPTIONS route handles CORS if needed
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
