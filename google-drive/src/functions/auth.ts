import * as fs from 'fs';
import { authenticate } from '@google-cloud/local-auth';
import { Auth, google } from 'googleapis';
import { CREDENTIALS_PATH, SCOPES, TOKEN_PATH } from '../constants/drive';

const loadSavedCredentialsIfExist = async (): Promise<Auth.OAuth2Client | null> => {
	try {
		const content = await fs.promises.readFile(TOKEN_PATH, 'utf-8');
		const credentials = JSON.parse(content);
		return google.auth.fromJSON(credentials) as Auth.OAuth2Client;
	} catch (err) {
		return null;
	}
};

const saveCredentials = async (client: Auth.OAuth2Client): Promise<void> => {
	const content = await fs.promises.readFile(CREDENTIALS_PATH, 'utf-8');
	const keys = JSON.parse(content);
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	await fs.promises.writeFile(TOKEN_PATH, payload);
};

export const getAuthClient = async (): Promise<Auth.OAuth2Client> => {
	let client = await loadSavedCredentialsIfExist();
	if (client) {
		return client;
	}

	client = await authenticate({
		scopes: SCOPES,
		keyfilePath: CREDENTIALS_PATH,
	});
	if (client.credentials) {
		await saveCredentials(client);
	}

	return client;
};
