import { Workbook } from 'exceljs';
import { existsSync } from 'fs';
import { setTimeout } from 'timers/promises';
import { CiNiiResearchResponse } from './interfaces/cinii_research_response';
import {
	articleColumns,
	existsWorksheet,
	saveArticleCreatorFoafNameTable,
	saveArticleCreatorJpcoarAffiliationNameTable,
	saveArticleCreatorPersonIdentifierTable,
} from './script_forShare5-2-ndjson_to_xlsx';

export const saveArticleCreatorTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleCreatorColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('creator');
		});
		return result;
	})();

	const getArticleCreatorRows = async (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		for await (const item of data) {
			const rows = [];
			// let personIdentifier = item.creator?.map((creator) => creator.personIdentifier);
			// let foafName = item.creator?.map((creator) => creator['foaf:name']);
			// let jpcoarAffiliationName = item.creator?.map(
			// 	(creator) => creator['jpcoar:affiliationName']
			// );
			item.creator?.forEach((creator) => {
				const row = {
					'@id': item['@id'],
					'creator-@id': creator['@id'],
					'creator-@type': creator['@type'],
				};
				rows.push(row);
			});

			// await Promise.all([
			// 	...personIdentifier.map((personIdentifier) => {
			// 		return saveArticleCreatorPersonIdentifierTable(filePath, item['@id'], personIdentifier);
			// 	}),
			// ]);
			// await Promise.all([
			// 	...foafName.map((foafName) => {
			// 		return saveArticleCreatorFoafNameTable(filePath, item['@id'], foafName);
			// 	}),
			// ]);
			// await Promise.all([
			// 	...jpcoarAffiliationName.map((jpcoarAffiliationName) => {
			// 		return saveArticleCreatorJpcoarAffiliationNameTable(
			// 			filePath,
			// 			item['@id'],
			// 			jpcoarAffiliationName
			// 		);
			// 	}),
			// ]);
			if (!item.creator) {
				if (rows.length) {
					throw new Error('creatorが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		}
		return formattedData;
	};

	const saveRelationTables = async (data: CiNiiResearchResponse[]) => {
		for await (const item of data) {
			// await Promise.all([
			// 	...item.creator?.map((creator) => {
			// 		return saveArticleCreatorPersonIdentifierTable(
			// 			filePath,
			// 			item['@id'],
			// 			creator.personIdentifier ?? []
			// 		);
			// 	}),
			// 	...item.creator?.map((creator) => {
			// 		return saveArticleCreatorFoafNameTable(
			// 			filePath,
			// 			item['@id'],
			// 			creator['foaf:name'] ?? []
			// 		);
			// 	}),
			// 	...item.creator?.map((creator) => {
			// 		return saveArticleCreatorJpcoarAffiliationNameTable(
			// 			filePath,
			// 			item['@id'],
			// 			creator['jpcoar:affiliationName'] ?? []
			// 		);
			// 	}),
			// ]);
			// Promise.allだと書き込み時にエラーが出るので、分割して行う
			item.creator?.forEach(async (creator) => {
				await saveArticleCreatorPersonIdentifierTable(
					workbook,
					filePath,
					item['@id'],
					creator.personIdentifier ?? []
				);
			});

			await setTimeout(100);

			item.creator?.forEach(async (creator) => {
				await saveArticleCreatorFoafNameTable(
					workbook,
					filePath,
					item['@id'],
					creator['foaf:name'] ?? []
				);
			});

			await setTimeout(100);

			item.creator?.forEach(async (creator) => {
				await saveArticleCreatorJpcoarAffiliationNameTable(
					workbook,
					filePath,
					item['@id'],
					creator['jpcoar:affiliationName'] ?? []
				);
			});
		}
	};

	const worksheetName = '著者';
	let worksheet;

	if (existsSync(filePath)) {
		await workbook.xlsx.readFile(filePath);
		worksheet = existsWorksheet(workbook, worksheetName)
			? workbook.getWorksheet(worksheetName)
			: workbook.addWorksheet(worksheetName);
	} else {
		worksheet = workbook.addWorksheet(worksheetName);
	}

	const filteredData = await getArticleCreatorRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleCreatorColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleCreatorColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleCreatorColumn;
	worksheet.addRows(filteredData);

	await workbook.xlsx.writeFile(filePath);

	await saveRelationTables(data);
};
