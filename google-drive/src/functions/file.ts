import * as fs from 'fs';
import { drive_v3 } from 'googleapis';
import { DOWNLOAD_PATH } from '../constants/drive';

require('dotenv').config();
const targetDirectory = process.env.PARENT_DIRECTORY_ID;

export const downLoadFile = async (drive: drive_v3.Drive, file: drive_v3.Schema$File) => {
	const fileId = file.id;
	if (!fileId) {
		console.error('File ID not found');
		return;
	}

	try {
		// fs.rmSync(DOWNLOAD_PATH, { recursive: true, force: true });
		fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
		const dest = fs.createWriteStream(`${DOWNLOAD_PATH}/${file.name}`, 'utf8');

		const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
		res.data.on('data', (chunk: any) => dest.write(chunk));
		res.data.on('end', () => dest.end());
		console.info(`Downloaded: ${file.name}`);
	} catch (err: any) {
		console.error(`Download error: ${file.name}`);
	}
};

export const getFiles = async (
	drive: drive_v3.Drive
): Promise<drive_v3.Schema$FileList[] | undefined> => {
	const _query = `trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
	const query = !targetDirectory ? _query : `'${targetDirectory}' in parents and ${_query}`;
	const param: drive_v3.Params$Resource$Files$List = {
		pageSize: 999,
		fields: 'files(id, name)',
		// https://developers.google.com/drive/api/guides/search-files?hl=ja
		q: query,
	};
	// https://developers.google.com/drive/api/reference/rest/v3/files/list?hl=ja
	try {
		const res = await drive.files.list(param);

		const files = res.data.files;
		return files;
	} catch (err) {
		console.error('Error retrieving files:', err);
	}
};
