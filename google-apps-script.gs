const SHEET_NAME = 'Form Responses';
const PHOTO_FOLDER_NAME = 'Priyadarshani Teacher Photos';
const HEADERS = [
  'Submitted At',
  'Full Name',
  'Designation',
  'Birthdate',
  'Blood Group',
  'Address',
  'Emergency Contact Number',
  'Photo Name',
  'Photo'
];

function doPost(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(spreadsheet);
  ensureHeaders_(sheet);

  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const rowValues = [
      data.submittedAt || new Date().toISOString(),
      data.fullName || '',
      data.designation || '',
      data.birthdate || '',
      data.bloodGroup || '',
      data.address || '',
      data.emergencyContact || '',
      data.photoFileName || '',
      'Photo processing...'
    ];

    sheet.appendRow(rowValues);
    const rowNumber = sheet.getLastRow();
    const photo = trySavePhoto_(data.photo, data.photoFileName || data.fullName);

    if (photo.url) {
      const link = SpreadsheetApp.newRichTextValue()
        .setText('Download Photo')
        .setLinkUrl(photo.url)
        .build();
      sheet.getRange(rowNumber, 9).setRichTextValue(link);
    } else {
      sheet.getRange(rowNumber, 9).setValue(photo.error || 'No photo received');
    }

    return json_({ success: true, photoUrl: photo.url, photoError: photo.error || '' });
  } catch (error) {
    sheet.appendRow([
      new Date().toISOString(),
      'Submission failed',
      '',
      '',
      '',
      '',
      '',
      '',
      String(error && error.message ? error.message : error)
    ]);

    return json_({ success: false, error: String(error && error.message ? error.message : error) });
  }
}

function doGet() {
  return json_({
    success: true,
    message: 'Priyadarshani form Apps Script is connected.'
  });
}

function setupAuthorization() {
  getOrCreateFolder_(PHOTO_FOLDER_NAME);
  SpreadsheetApp.getActiveSpreadsheet().toast('Authorization setup completed.');
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(spreadsheet) {
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const headersMatch = HEADERS.every((header, index) => firstRow[index] === header);

  if (!headersMatch) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }
}

function savePhoto_(dataUrl, requestedName) {
  if (!dataUrl) {
    return { url: '', formula: '' };
  }

  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) {
    return { url: '', formula: '' };
  }

  const contentType = matches[1];
  const base64 = matches[2];
  const extension = contentType.split('/')[1].replace('jpeg', 'jpg');
  const safeName = String(requestedName || 'teacher-photo')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'teacher-photo';

  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64),
    contentType,
    `${safeName}.${extension}`
  );

  const folder = getOrCreateFolder_(PHOTO_FOLDER_NAME);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.getId()}`;
  return {
    url: downloadUrl,
    formula: ''
  };
}

function trySavePhoto_(dataUrl, requestedName) {
  try {
    return savePhoto_(dataUrl, requestedName);
  } catch (error) {
    return {
      url: '',
      formula: `Photo upload failed: ${String(error && error.message ? error.message : error)}`,
      error: String(error && error.message ? error.message : error)
    };
  }
}

function getOrCreateFolder_(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}
