const { google } = require('googleapis');
const creds = require('./google-credentials.json');
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({version: 'v3', auth});
drive.files.list({q: "'1p20sqbJan8wVIlPqPuPMBwN5P5vgrE6b' in parents and trashed=false"})
  .then(r => console.log(r.data.files.map(f => f.name)))
  .catch(console.error);
