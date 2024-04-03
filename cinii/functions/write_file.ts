import { writeFile } from 'fs/promises';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { CiNiiResearchResponse } from '../interfaces/cinii_research_response';
import { forJson, forXlsx, forXlsxWsHeader } from '../interfaces/prepare_cinii_research_response';

/**
 * 
 * @param filename - ファイル名
 * @param count - カウント結果
 */
export const writeCiNiiResearchResponseCount = async (filename: string, count: object) => {
	await writeFile(`${filename}.json`, JSON.stringify(count, null, 2));
};

/**
 * 
 * @param filename - ファイル名
 * @param data - CiNiiResearchResponse
 */
const writeXlsx = (filename: string, data: CiNiiResearchResponse[]) => {
	const wsData = data.map((d) => forXlsx(d));
	const ws = xlsxUtils.json_to_sheet(wsData, { header: forXlsxWsHeader(wsData) });
	const wb = xlsxUtils.book_new();
	xlsxUtils.book_append_sheet(wb, ws, 'Sheet1');
	xlsxWriteFile(wb, `${filename}.xlsx`);
};

/**
 * 
 * @param filename - ファイル名
 * @param data - CiNiiResearchResponse
 */
const writeJson = async (filename: string, data: CiNiiResearchResponse[]) => {
	await writeFile(`${filename}.json`, data.map((article) => JSON.stringify(article)).join('\n') + '\n');
};

/**
 * 
 * @param filename - ファイル名
 * @param data - CiNiiResearchResponse
 */
export const writeCiNiiResearchResponseData = (filename: string, data: CiNiiResearchResponse[]) => {
	writeXlsx(filename, data);
	writeJson(filename, data);
};

// export const writeIdData = async (data: string[]) => {};
