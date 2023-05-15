import * as path from 'path';
import * as process from 'process';

export const SCOPES = [
	'https://www.googleapis.com/auth/drive',
	'https://www.googleapis.com/auth/drive.file',
	'https://www.googleapis.com/auth/drive.readonly',
	'https://www.googleapis.com/auth/drive.metadata.readonly',
	'https://www.googleapis.com/auth/drive.appdata',
	'https://www.googleapis.com/auth/drive.metadata',
	'https://www.googleapis.com/auth/drive.photos.readonly',
];

export const TOKEN_PATH = path.join(process.cwd(), 'token.json');

export const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

export const DOWNLOAD_PATH = './test';
