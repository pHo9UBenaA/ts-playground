import { google } from 'googleapis';
import { getAuthClient } from './functions/auth';
import { downLoadFile, getFiles } from './functions/file';

const main = async () => {
	console.info('Authentication');
	const authClient = await getAuthClient();
	const drive = google.drive({ version: 'v3', auth: authClient });

	console.info('Get files info');
	const files = await getFiles(drive);
	if (!files) {
		console.info('No files found');
		return;
	}

	console.info('Downloading files');
	files.map((file: any) => {
		downLoadFile(drive, file);
	});
};

main();
