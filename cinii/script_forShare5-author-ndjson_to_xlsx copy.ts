// docker compose exec node ./cinii/node_modules/.bin/ts-node ./cinii/script_forShare5-author-ndjson_to_xlsx.ts
import { Workbook } from 'exceljs';
import { createReadStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import Chain, { chain } from 'stream-chain';
import { withParser } from 'stream-json/streamers/StreamValues';
import { setTimeout } from 'timers/promises';
import { CiNiiResearchResponse } from './interfaces/cinii_research_response';

const dirPrefix = 'cinii';
const propertySeparator = '-';

/**
 * notArrayDataParams: バリューに配列が含まれれない第一階層のプロパティ名
 * arrayDataParams: バリューに配列が含まれる第一階層のプロパティ名（再起的なものも含む）
 */
const localMaster = {
	notArrayDataParams: [
		// 配列の含まないオブジェクト
		'@context',
		'jpcoar:conferenceDate', // 一応論文でも帰ってくるっぽい
		'dcterms:medium', // これ書籍にしかなさそう
		// 文字列
		'@id',
		'@type',
		'resourceType',
		'dc:language',
		'since',
		'until',
		'reviewed',
		'dcterms:accessRights',
		'ndl:dissertationNumber',
		'ndl:dateGranted',
		'ndl:degreeName',
		'jpcoar:conferenceName',
		'jpcoar:conferencePlace',
		'jpcoar:conferenceSponsor',
		'invited',
		'prism:edition',
		'printing',
		'dc:date',
		'dc:creator',
		'publicationCountryCode',
		'cinii:size',
		'dcterms:extent',
		'publicationStatusCode',
		'publicationPeriodicityCode',
		'publicationRegularityCode',
		'serialsTypeCode',
		'datacite:version',
		'createdAt',
		'modifiedAt',
		'allocationAmount',
		'projectStatus',
	],
	arrayDataParams: [
		// 第一階層のバリューが配列になっているもの（文字列配列やオブジェクト配列）
		'projectIdentifier',
		'personIdentifier',
		'productIdentifier',
		'dc:title',
		'jpcoar:awardTitle',
		'dcterms:alternative',
		'dcterms:publisher',
		'dc:subject',
		'jpcoar:extent',
		'format',
		'dc:rights',
		'cinii:note',
		'dataSourceIdentifier',
		// 第一階層のバリューがオブジェクト配列になっている、かつ配列内オブジェクトのバリューに配列が含まれるもの
		'foaf:Person',
		'career',
		'field', // 特に厄介かもしれない 配列ない配列ない配列
		'description',
		'researcher',
		'institution',
		'fundingProgram',
		'creator',
		'contributor',
		'url',
		'foaf:topic',
		'project',
		'relatedProject',
		'product',
		'relatedProduct',
		'dcterms:tableOfContents',
		'allocationClassification', // 特に厄介かもしれない 配列ない配列ない配列
		// 第一階層はオブジェクトだが、オブジェクト内のバリューが配列になっているもの
		'publication',
		'degreeAwardInstitution',
		'dcterms:subject',
		'grant',
		// ...objectValueInArrayDataParams,
	],
} satisfies {
	notArrayDataParams: (keyof CiNiiResearchResponse)[];
	arrayDataParams: (keyof CiNiiResearchResponse)[];
};

const authorColumns = [
	{ key: `@context${propertySeparator}@vocab`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}rdfs`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}dc`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}dcterms`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}foaf`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}prism`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}cinii`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}datacite`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}ndl`, header: 'コンテキスト' },
	{ key: `@context${propertySeparator}jpcoar`, header: 'コンテキスト' },
	{ key: '@id', header: '1.CiNiiResearchのID' },
	{ key: '@type', header: '1.データ種別' },
	// { key: 'personIdentifier', header: '3.CiNiiResearch外部の識別子' },
	{ key: 'personIdentifier-@type', header: '3.CiNiiResearch外部の識別子-識別子タイプ' },
	{ key: 'personIdentifier-@value', header: '3.CiNiiResearch外部の識別子-コード値' },
	// { key: 'foaf:Person', header: '7.氏名' },
	{ key: 'foaf:Person-foaf:name-@language', header: '7.氏名-表記(言語種別)' },
	{ key: 'foaf:Person-foaf:name-@value', header: '7.氏名-表記' },
	{ key: 'foaf:Person-foaf:familyName-@language', header: '7.氏名-姓(言語種別)' },
	{ key: 'foaf:Person-foaf:familyName-@value', header: '7.氏名-姓' },
	{ key: 'foaf:Person-foaf:givenName-@language', header: '7.氏名-名(言語種別)' },
	{ key: 'foaf:Person-foaf:givenName-@value', header: '7.氏名-名' },
	{ key: 'foaf:Person-foaf:middleName-@language', header: '7.氏名-ミドルネーム(言語種別)' },
	{ key: 'foaf:Person-foaf:middleName-@value', header: '7.氏名-ミドルネーム' },
	// { key: 'career', header: '8.所属' },
	{ key: 'career-custom-id', header: '8.所属-集計時に独自で定義したID' },
	{ key: 'career-since', header: '8.所属-開始日' },
	{ key: 'career-until', header: '8.所属-終了日' },
	{ key: 'career-institution-institutionIdentifier-@type', header: '8.所属-機関-識別子タイプ' },
	{ key: 'career-institution-institutionIdentifier-@value', header: '8.所属-機関-コード値' },
	{ key: 'career-institution-notation-@language', header: '8.所属-機関-表記(言語種別)' },
	{ key: 'career-institution-notation-@value', header: '8.所属-機関-表記' },
	{ key: 'career-department-departmentIdentifier-@type', header: '8.所属-部局-識別子タイプ' },
	{ key: 'career-department-departmentIdentifier-@value', header: '8.所属-部局-コード値' },
	{ key: 'career-department-notation-@language', header: '8.所属-部局-表記(言語種別)' },
	{ key: 'career-department-notation-@value', header: '8.所属-部局-表記' },
	{ key: 'career-jobTitle-jobTitleIdentifier-@type', header: '8.所属-役職-識別子タイプ' },
	{ key: 'career-jobTitle-jobTitleIdentifier-@value', header: '8.所属-役職-コード値' },
	{ key: 'career-jobTitle-notation-@language', header: '8.所属-役職-表記(言語種別)' },
	{ key: 'career-jobTitle-notation-@value', header: '8.所属-役職-表記' },
	{ key: 'url-@id', header: '27.URL' },
	{ key: 'url-notation-@language', header: '27.URL-表記(言語種別)' },
	{ key: 'url-notation-@value', header: '27.URL-表記' },
	{ key: 'project-@id', header: '32.プロジェクト-CiNiiResearchにおけるID' },
	{ key: 'project-@type', header: '32.プロジェクト-成果物における種別' },
	{ key: 'project-projectIdentifier-@type', header: '32.プロジェクト-識別子タイプ' },
	{ key: 'project-projectIdentifier-@value', header: '32.プロジェクト-コード値' },
	{ key: 'project-notation-@language', header: '32.プロジェクト-表記(言語種別)' },
	{ key: 'project-notation-@value', header: '32.プロジェクト-表記' },
	{ key: 'project-role', header: '32.プロジェクト-本研究における役割' },
	// { key: 'product', header: '34.成果物' },
	{ key: 'product-@id', header: '34.成果物-CiNiiResearchにおけるID' },
	{ key: 'product-@type', header: '34.成果物-成果物種別' },
	{ key: 'product-resourceType', header: '34.成果物-リソース種別' },
	{ key: 'product-productIdentifier-@type', header: '34.成果物-識別子タイプ' },
	{ key: 'product-productIdentifier-@value', header: '34.成果物-コード値' },
	{ key: 'product-notation-@language', header: '34.成果物-表記(言語種別)' },
	{ key: 'product-notation-@value', header: '34.成果物-表記' },
	{ key: 'product-relation-type', header: '34.成果物-関連種別' },
	{ key: 'product-relation-detail', header: '34.成果物-関連詳細' },
	{ key: 'dataSourceIdentifier-@type', header: '36.データソース識別子-識別子タイプ' },
	{ key: 'dataSourceIdentifier-@value', header: '36.データソース識別子-コード値' },
];

const checkAuthorColumns = [
	{ key: '@context', header: 'コンテキスト' },
	{ key: '@id', header: '1.CiNiiResearchのID' },
	{ key: '@type', header: '1.データ種別' },
	{ key: 'personIdentifier', header: '3.CiNiiResearch外部の識別子' },
	{ key: 'foaf:Person', header: '7.氏名' },
	{ key: 'career', header: '8.所属' },
	{ key: 'url', header: '27.URL' },
	{ key: 'project', header: '32.プロジェクト（研究課題）' },
	{ key: 'product', header: '34.成果物' },
	{ key: 'dataSourceIdentifier', header: '36.データソース識別子' },
];

const resetAppendFile = async (filePath: string) => {
	if (existsSync(filePath)) {
		await unlink(filePath);
	}
};

const existsWorksheet = (workbook: Workbook, worksheetName: string) => {
	return workbook.worksheets.some((worksheet) => worksheet.name === worksheetName);
};

const saveAuthorPeronIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const authorPersonIdentifierColumn = (() => {
		const result = authorColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('personIdentifier');
		});
		return result;
	})();

	const getAuthorPersonIdentifierRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item.personIdentifier?.forEach((personIdentifier) => {
				const row = {
					'@id': item['@id'],
					'personIdentifier-@type': personIdentifier['@type'],
					'personIdentifier-@value': personIdentifier['@value'],
				};
				rows.push(row);
			});
			if (!item.personIdentifier) {
				if (rows.length) {
					throw new Error('personIdentifierが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = 'CiNiiResearch外部の識別子';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorPersonIdentifierRows(data);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorPersonIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorPersonIdentifierColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorPersonIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorFoafPersonFoafNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	name: CiNiiResearchResponse['foaf:Person'][0]['foaf:name']
) => {
	const authorFoafPersonFoafNameColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'foaf:Person-foaf:name-@language' ||
				column.key === 'foaf:Person-foaf:name-@value'
			);
		});
		return result;
	})();

	const getAuthorFoafPersonFoafNameRows = (
		id: CiNiiResearchResponse['@id'],
		name: CiNiiResearchResponse['foaf:Person'][0]['foaf:name']
	) => {
		let formattedData = [];
		name?.forEach((item) => {
			const row = {
				'@id': id,
				'foaf:Person-foaf:name-@language': item['@language'],
				'foaf:Person-foaf:name-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!name) {
			if (formattedData.length) {
				throw new Error('nameが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '氏名-表記';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorFoafPersonFoafNameRows(id, name);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorFoafPersonFoafNameColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorFoafPersonFoafNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorFoafPersonFoafNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorFoafPersonFoafFamilyNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	familyName: CiNiiResearchResponse['foaf:Person'][0]['foaf:familyName']
) => {
	const authorFoafPersonFoafFamilyNameColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'foaf:Person-foaf:familyName-@language' ||
				column.key === 'foaf:Person-foaf:familyName-@value'
			);
		});
		return result;
	})();

	const getAuthorFoafPersonFoafFamilyNameRows = (
		id: CiNiiResearchResponse['@id'],
		familyName: CiNiiResearchResponse['foaf:Person'][0]['foaf:familyName']
	) => {
		let formattedData = [];
		familyName?.forEach((item) => {
			const row = {
				'@id': id,
				'foaf:Person-foaf:familyName-@language': item['@language'],
				'foaf:Person-foaf:familyName-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!familyName) {
			if (formattedData.length) {
				throw new Error('familyNameが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '氏名-姓';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorFoafPersonFoafFamilyNameRows(id, familyName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorFoafPersonFoafFamilyNameColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorFoafPersonFoafFamilyNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorFoafPersonFoafFamilyNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorFoafPersonFoafGivenNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	givenName: CiNiiResearchResponse['foaf:Person'][0]['foaf:givenName']
) => {
	const authorFoafPersonFoafGivenNameColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'foaf:Person-foaf:givenName-@language' ||
				column.key === 'foaf:Person-foaf:givenName-@value'
			);
		});
		return result;
	})();

	const getAuthorFoafPersonFoafGivenNameRows = (
		id: CiNiiResearchResponse['@id'],
		givenName: CiNiiResearchResponse['foaf:Person'][0]['foaf:givenName']
	) => {
		let formattedData = [];
		givenName?.forEach((item) => {
			const row = {
				'@id': id,
				'foaf:Person-foaf:givenName-@language': item['@language'],
				'foaf:Person-foaf:givenName-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!givenName) {
			if (formattedData.length) {
				throw new Error('givenNameが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '氏名-名';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorFoafPersonFoafGivenNameRows(id, givenName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorFoafPersonFoafGivenNameColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorFoafPersonFoafGivenNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorFoafPersonFoafGivenNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorFoafPersonFoafMiddleNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	middleName: CiNiiResearchResponse['foaf:Person'][0]['foaf:middleName']
) => {
	const authorFoafPersonFoafMiddleNameColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'foaf:Person-foaf:middleName-@language' ||
				column.key === 'foaf:Person-foaf:middleName-@value'
			);
		});
		return result;
	})();

	const getAuthorFoafPersonFoafMiddleNameRows = (
		id: CiNiiResearchResponse['@id'],
		middleName: CiNiiResearchResponse['foaf:Person'][0]['foaf:middleName']
	) => {
		let formattedData = [];
		middleName?.forEach((item) => {
			const row = {
				'@id': id,
				'foaf:Person-foaf:middleName-@language': item['@language'],
				'foaf:Person-foaf:middleName-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!middleName) {
			if (formattedData.length) {
				throw new Error('middleNameが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '氏名-ミドルネーム';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorFoafPersonFoafMiddleNameRows(id, middleName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorFoafPersonFoafMiddleNameColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorFoafPersonFoafMiddleNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorFoafPersonFoafMiddleNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorFoafPersonRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpFoafName = [];
	const tmpFoafFamilyName = [];
	const tmpFoafGivenName = [];
	const tmpFoafMiddleName = [];

	for await (const item of data) {
		if (item['foaf:Person']) {
			for (const person of item['foaf:Person']) {
				if (person['foaf:name']) {
					tmpFoafName.push({
						id: item['@id'],
						name: person['foaf:name'],
					});
				} else {
					tmpFoafName.push({
						id: item['@id'],
					});
				}
				if (person['foaf:familyName']) {
					tmpFoafFamilyName.push({
						id: item['@id'],
						familyName: person['foaf:familyName'],
					});
				} else {
					tmpFoafFamilyName.push({
						id: item['@id'],
					});
				}
				if (person['foaf:givenName']) {
					tmpFoafGivenName.push({
						id: item['@id'],
						givenName: person['foaf:givenName'],
					});
				} else {
					tmpFoafGivenName.push({
						id: item['@id'],
					});
				}
				if (person['foaf:middleName']) {
					tmpFoafMiddleName.push({
						id: item['@id'],
						middleName: person['foaf:middleName'],
					});
				} else {
					tmpFoafMiddleName.push({
						id: item['@id'],
					});
				}
			}
		} else {
			tmpFoafName.push({
				id: item['@id'],
			});
			tmpFoafFamilyName.push({
				id: item['@id'],
			});
			tmpFoafGivenName.push({
				id: item['@id'],
			});
			tmpFoafMiddleName.push({
				id: item['@id'],
			});
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpFoafName) {
		await saveAuthorFoafPersonFoafNameTable(workbook, filePath, item.id, item.name);
	}
	for await (const item of tmpFoafFamilyName) {
		await saveAuthorFoafPersonFoafFamilyNameTable(workbook, filePath, item.id, item.familyName);
	}
	for await (const item of tmpFoafGivenName) {
		await saveAuthorFoafPersonFoafGivenNameTable(workbook, filePath, item.id, item.givenName);
	}
	for await (const item of tmpFoafMiddleName) {
		await saveAuthorFoafPersonFoafMiddleNameTable(workbook, filePath, item.id, item.middleName);
	}
};

const saveAuthorCareerInstitutionInstitutionIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	data: any[]
) => {
	const authorCareerInstitutionInstitutionIdentifierColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'career-custom-id' ||
				column.key === 'career-institution-institutionIdentifier-@type' ||
				column.key === 'career-institution-institutionIdentifier-@value'
			);
		});
		return result;
	})();

	const worksheetName = '所属-所属機関-識別子';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	data.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!authorCareerInstitutionInstitutionIdentifierColumn.some(
					(column) => column.key === key
				)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorCareerInstitutionInstitutionIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorCareerInstitutionInstitutionIdentifierColumn;
	worksheet.addRows(data);

	// await workbook;
};

const saveAuthorCareerInstitutionNotationTable = async (
	workbook: Workbook,
	filePath: string,
	data: any[]
) => {
	const authorCareerInstitutionNotationColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'career-custom-id' ||
				column.key === 'career-institution-notation-@language' ||
				column.key === 'career-institution-notation-@value'
			);
		});
		return result;
	})();

	const worksheetName = '所属-所属機関-表記';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	data.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorCareerInstitutionNotationColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorCareerInstitutionNotationColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorCareerInstitutionNotationColumn;
	worksheet.addRows(data);

	// await workbook;
};

const saveAuthorCareerDepartmentDepartmentIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	data: any[]
) => {
	const authorCareerDepartmentDepartmentIdentifierColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'career-custom-id' ||
				column.key === 'career-department-departmentIdentifier-@type' ||
				column.key === 'career-department-departmentIdentifier-@value'
			);
		});
		return result;
	})();

	const worksheetName = '所属-部局-識別子';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	data.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!authorCareerDepartmentDepartmentIdentifierColumn.some(
					(column) => column.key === key
				)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorCareerDepartmentDepartmentIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorCareerDepartmentDepartmentIdentifierColumn;
	worksheet.addRows(data);

	// await workbook;
};

const saveAuthorCareerDepartmentNotationTable = async (
	workbook: Workbook,
	filePath: string,
	data: any[]
) => {
	const authorCareerDepartmentNotationColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'career-custom-id' ||
				column.key === 'career-department-notation-@language' ||
				column.key === 'career-department-notation-@value'
			);
		});
		return result;
	})();

	const worksheetName = '所属-部局-表記';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	data.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorCareerDepartmentNotationColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorCareerDepartmentNotationColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorCareerDepartmentNotationColumn;
	worksheet.addRows(data);

	// await workbook;
};

const saveAuthorCareerJobTitleJobTitleIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	data: any[]
) => {
	const authorCareerJobTitleJobTitleIdentifierColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'career-custom-id' ||
				column.key === 'career-jobTitle-jobTitleIdentifier-@type' ||
				column.key === 'career-jobTitle-jobTitleIdentifier-@value'
			);
		});
		return result;
	})();

	const worksheetName = '所属-役職-識別子';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	data.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!authorCareerJobTitleJobTitleIdentifierColumn.some((column) => column.key === key)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorCareerJobTitleJobTitleIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorCareerJobTitleJobTitleIdentifierColumn;
	worksheet.addRows(data);

	// await workbook;
};

const saveAuthorCareerJobTitleNotationTable = async (
	workbook: Workbook,
	filePath: string,
	data: any[]
) => {
	const authorCareerJobTitleNotationColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'career-custom-id' ||
				column.key === 'career-jobTitle-notation-@language' ||
				column.key === 'career-jobTitle-notation-@value'
			);
		});
		return result;
	})();

	const worksheetName = '所属-役職-表記';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	data.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorCareerJobTitleNotationColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorCareerJobTitleNotationColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorCareerJobTitleNotationColumn;
	worksheet.addRows(data);

	// await workbook;
};

/** careerはIDが存在しないがRelationテーブルは必要なので、career-idを独自で再版する。またここで再版するため、ここでsaveAuthorCareerRelationTablesも定義する **/
const saveAuthorCareerTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const authorCareerColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'career-custom-id' ||
				column.key === 'career-since' ||
				column.key === 'career-until'
			);
		});
		return result;
	})();

	const getAuthorCareerRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		let institutionInstitutionIdentifierData = [];
		let institutionNotationData = [];
		let departmentDepartmentIdentifierData = [];
		let departmentNotationData = [];
		let jobTitleJobTitleIdentifierData = [];
		let jobTitleNotationData = [];
		data.forEach((item) => {
			const rows = [];
			item.career?.forEach((career, index) => {
				const customId = `${item['@id']}-${index}`;
				const row = {
					'@id': item['@id'],
					'career-custom-id': customId,
					'career-since': career['since'],
					'career-until': career['until'],
				};
				rows.push(row);

				if (career.institution) {
					let institutionInstitutionIdentifierRows = [];
					career.institution.institutionIdentifier?.forEach(
						(institutionIdentifier, index) => {
							const institutionRow = {
								'@id': item['@id'],
								'career-custom-id': customId,
								'career-institution-institutionIdentifier-@type':
									institutionIdentifier['@type'],
								'career-institution-institutionIdentifier-@value':
									institutionIdentifier['@value'],
							};
							institutionInstitutionIdentifierRows.push(institutionRow);
						}
					);
					if (!career.institution.institutionIdentifier) {
						if (institutionInstitutionIdentifierRows.length) {
							throw new Error(
								'institutionIdentifierが存在しないのにrowsが存在します'
							);
						}
						institutionInstitutionIdentifierRows.push({
							'@id': item['@id'],
							'career-custom-id': customId,
						});
					}

					let institutionNotationRows = [];
					career.institution.notation?.forEach((notation, index) => {
						const institutionRow = {
							'@id': item['@id'],
							'career-custom-id': customId,
							'career-institution-notation-@language': notation['@language'],
							'career-institution-notation-@value': notation['@value'],
						};
						institutionNotationRows.push(institutionRow);
					});
					if (!career.institution.notation) {
						if (institutionNotationRows.length) {
							throw new Error('notationが存在しないのにrowsが存在します');
						}
						institutionNotationRows.push({
							'@id': item['@id'],
							'career-custom-id': customId,
						});
					}

					institutionInstitutionIdentifierData = [
						...institutionInstitutionIdentifierData,
						...institutionInstitutionIdentifierRows,
					];
					institutionNotationData = [
						...institutionNotationData,
						...institutionNotationRows,
					];
				} else {
					institutionInstitutionIdentifierData = [
						...institutionInstitutionIdentifierData,
						{ '@id': item['@id'], 'career-custom-id': customId },
					];
					institutionNotationData = [
						...institutionNotationData,
						{ '@id': item['@id'], 'career-custom-id': customId },
					];
				}

				if (career.department) {
					let departmentDepartmentIdentifierRows = [];
					career.department.departmentIdentifier?.forEach(
						(departmentIdentifier, index) => {
							const departmentRow = {
								'@id': item['@id'],
								'career-custom-id': customId,
								'career-department-departmentIdentifier-@type':
									departmentIdentifier['@type'],
								'career-department-departmentIdentifier-@value':
									departmentIdentifier['@value'],
							};
							departmentDepartmentIdentifierRows.push(departmentRow);
						}
					);
					if (!career.department.departmentIdentifier) {
						if (departmentDepartmentIdentifierRows.length) {
							throw new Error('departmentIdentifierが存在しないのにrowsが存在します');
						}
						departmentDepartmentIdentifierRows.push({
							'@id': item['@id'],
							'career-custom-id': customId,
						});
					}

					let departmentNotationRows = [];
					career.department.notation?.forEach((notation, index) => {
						const departmentRow = {
							'@id': item['@id'],
							'career-custom-id': customId,
							'career-department-notation-@language': notation['@language'],
							'career-department-notation-@value': notation['@value'],
						};
						departmentNotationRows.push(departmentRow);
					});
					if (!career.department.notation) {
						if (departmentNotationRows.length) {
							throw new Error('notationが存在しないのにrowsが存在します');
						}
						departmentNotationRows.push({
							'@id': item['@id'],
							'career-custom-id': customId,
						});
					}

					departmentDepartmentIdentifierData = [
						...departmentDepartmentIdentifierData,
						...departmentDepartmentIdentifierRows,
					];
					departmentNotationData = [...departmentNotationData, ...departmentNotationRows];
				} else {
					departmentDepartmentIdentifierData = [
						...departmentDepartmentIdentifierData,
						{ '@id': item['@id'], 'career-custom-id': customId },
					];
					departmentNotationData = [
						...departmentNotationData,
						{ '@id': item['@id'], 'career-custom-id': customId },
					];
				}

				if (career.jobTitle) {
					let jobTitleJobTitleIdentifierRows = [];
					career.jobTitle.jobTitleIdentifier?.forEach((jobTitleIdentifier, index) => {
						const jobTitleRow = {
							'@id': item['@id'],
							'career-custom-id': customId,
							'career-jobTitle-jobTitleIdentifier-@type': jobTitleIdentifier['@type'],
							'career-jobTitle-jobTitleIdentifier-@value':
								jobTitleIdentifier['@value'],
						};
						jobTitleJobTitleIdentifierRows.push(jobTitleRow);
					});
					if (!career.jobTitle.jobTitleIdentifier) {
						if (jobTitleJobTitleIdentifierRows.length) {
							throw new Error('jobTitleIdentifierが存在しないのにrowsが存在します');
						}
						jobTitleJobTitleIdentifierRows.push({
							'@id': item['@id'],
							'career-custom-id': customId,
						});
					}

					let jobTitleNotationRows = [];
					career.jobTitle.notation?.forEach((notation, index) => {
						const jobTitleRow = {
							'@id': item['@id'],
							'career-custom-id': customId,
							'career-jobTitle-notation-@language': notation['@language'],
							'career-jobTitle-notation-@value': notation['@value'],
						};
						jobTitleNotationRows.push(jobTitleRow);
					});
					if (!career.jobTitle.notation) {
						if (jobTitleNotationRows.length) {
							throw new Error('notationが存在しないのにrowsが存在します');
						}
						jobTitleNotationRows.push({
							'@id': item['@id'],
							'career-custom-id': customId,
						});
					}

					jobTitleJobTitleIdentifierData = [
						...jobTitleJobTitleIdentifierData,
						...jobTitleJobTitleIdentifierRows,
					];
					jobTitleNotationData = [...jobTitleNotationData, ...jobTitleNotationRows];
				} else {
					jobTitleJobTitleIdentifierData = [
						...jobTitleJobTitleIdentifierData,
						{ '@id': item['@id'], 'career-custom-id': customId },
					];
					jobTitleNotationData = [
						...jobTitleNotationData,
						{ '@id': item['@id'], 'career-custom-id': customId },
					];
				}
			});
			if (!item.career) {
				if (rows.length) {
					throw new Error('careerが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'], 'career-custom-id': `${item['@id']}-0` });
			}
			formattedData = [...formattedData, ...rows];
		});
		return {
			formattedData,
			institutionInstitutionIdentifierData,
			institutionNotationData,
			departmentDepartmentIdentifierData,
			departmentNotationData,
			jobTitleJobTitleIdentifierData,
			jobTitleNotationData,
		};
	};

	const worksheetName = '所属';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const { formattedData: filteredData, ...relationData } = getAuthorCareerRows(data);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorCareerColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorCareerColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorCareerColumn;
	worksheet.addRows(filteredData);

	await saveAuthorCareerInstitutionInstitutionIdentifierTable(
		workbook,
		filePath,
		relationData.institutionInstitutionIdentifierData
	);
	await saveAuthorCareerInstitutionNotationTable(
		workbook,
		filePath,
		relationData.institutionNotationData
	);
	await saveAuthorCareerDepartmentDepartmentIdentifierTable(
		workbook,
		filePath,
		relationData.departmentDepartmentIdentifierData
	);
	await saveAuthorCareerDepartmentNotationTable(
		workbook,
		filePath,
		relationData.departmentNotationData
	);
	await saveAuthorCareerJobTitleJobTitleIdentifierTable(
		workbook,
		filePath,
		relationData.jobTitleJobTitleIdentifierData
	);
	await saveAuthorCareerJobTitleNotationTable(
		workbook,
		filePath,
		relationData.jobTitleNotationData
	);

	// await workbook;
};

const saveAuthorUrlNodeTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	urlId: CiNiiResearchResponse['url'][0]['@id'],
	notation: CiNiiResearchResponse['url'][0]['notation']
) => {
	const authorUrlNodeColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'url-@id' ||
				column.key.startsWith('url-notation')
			);
		});
		return result;
	})();

	const getAuthorUrlNodeRows = (
		id: CiNiiResearchResponse['@id'],
		notation: CiNiiResearchResponse['url'][0]['notation']
	) => {
		let formattedData = [];
		notation?.forEach((item) => {
			const row = {
				'@id': id,
				'url-@id': urlId,
				'url-notation-@language': item['@language'],
				'url-notation-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!notation) {
			if (formattedData.length) {
				throw new Error('notationが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'url-@id': urlId });
		}
		return formattedData;
	};

	const worksheetName = 'URL-表記';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorUrlNodeRows(id, notation);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorUrlNodeColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorUrlNodeColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorUrlNodeColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorUrlRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpUrlNode = [];

	for await (const item of data) {
		if (item.url) {
			for (const url of item.url) {
				tmpUrlNode.push({
					id: item['@id'],
					urlId: url['@id'],
					notation: url['notation'],
				});
			}
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpUrlNode) {
		await saveAuthorUrlNodeTable(workbook, filePath, item.id, item.urlId, item.notation);
	}
};

const saveAuthorUrlTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const authorUrlColumn = (() => {
		const result = authorColumns.filter((column) => {
			return column.key === '@id' || column.key === 'url-@id';
		});
		return result;
	})();

	const getAuthorUrlRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item.url?.forEach((url) => {
				const row = {
					'@id': item['@id'],
					'url-@id': url['@id'],
				};
				rows.push(row);
			});
			if (!item.url) {
				if (rows.length) {
					throw new Error('urlが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = 'URL';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorUrlRows(data);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorUrlColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorUrlColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorUrlColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorProjectProjectIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	projectId: CiNiiResearchResponse['project'][0]['@id'],
	projectIdentifier: CiNiiResearchResponse['project'][0]['projectIdentifier']
) => {
	const authorProjectProjectIdentifierColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'project-@id' ||
				column.key.startsWith('project-projectIdentifier')
			);
		});
		return result;
	})();

	const getAuthorProjectProjectIdentifierRows = (
		id: CiNiiResearchResponse['@id'],
		projectIdentifier: CiNiiResearchResponse['project'][0]['projectIdentifier']
	) => {
		let formattedData = [];
		projectIdentifier?.forEach((item) => {
			const row = {
				'@id': id,
				'project-@id': projectId,
				'project-projectIdentifier-@type': item['@type'],
				'project-projectIdentifier-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!projectIdentifier) {
			if (formattedData.length) {
				throw new Error('projectIdentifierが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'project-@id': projectId });
		}
		return formattedData;
	};

	const worksheetName = 'プロジェクト-識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorProjectProjectIdentifierRows(id, projectIdentifier);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorProjectProjectIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorProjectProjectIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorProjectProjectIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorProjectNotationTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	projectId: CiNiiResearchResponse['project'][0]['@id'],
	notation: CiNiiResearchResponse['project'][0]['notation']
) => {
	const authorProjectNotationColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'project-@id' ||
				column.key.startsWith('project-notation')
			);
		});
		return result;
	})();

	const getAuthorProjectNotationRows = (
		id: CiNiiResearchResponse['@id'],
		notation: CiNiiResearchResponse['project'][0]['notation']
	) => {
		let formattedData = [];
		notation?.forEach((item) => {
			const row = {
				'@id': id,
				'project-@id': projectId,
				'project-notation-@language': item['@language'],
				'project-notation-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!notation) {
			if (formattedData.length) {
				throw new Error('notationが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'project-@id': projectId });
		}
		return formattedData;
	};

	const worksheetName = 'プロジェクト-表記';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorProjectNotationRows(id, notation);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorProjectNotationColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorProjectNotationColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorProjectNotationColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorProjectRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpProjectIdentifier = [];
	const tmpNotation = [];

	for await (const item of data) {
		if (item.project) {
			tmpProjectIdentifier.push({
				id: item['@id'],
				projectId: item.project[0]['@id'],
				projectIdentifier: item.project[0]['projectIdentifier'] ?? [],
			});
			tmpNotation.push({
				id: item['@id'],
				projectId: item.project[0]['@id'],
				notation: item.project[0]['notation'] ?? [],
			});
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpProjectIdentifier) {
		await saveAuthorProjectProjectIdentifierTable(
			workbook,
			filePath,
			item.id,
			item.projectId,
			item.projectIdentifier
		);
	}

	for await (const item of tmpNotation) {
		await saveAuthorProjectNotationTable(
			workbook,
			filePath,
			item.id,
			item.projectId,
			item.notation
		);
	}
};

const saveAuthorProjectTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const authorProjectColumn = (() => {
		const result = authorColumns.filter((column) => {
			return column.key === '@id' || column.key === 'project-@id';
		});
		return result;
	})();

	const getAuthorProjectRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item.project?.forEach((project) => {
				const row = {
					'@id': item['@id'],
					'project-@id': project['@id'],
				};
				rows.push(row);
			});
			if (!item.project) {
				if (rows.length) {
					throw new Error('projectが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = 'プロジェクト';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorProjectRows(data);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorProjectColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorProjectColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorProjectColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorProductProductIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	productId: CiNiiResearchResponse['product'][0]['@id'],
	productIdentifier: CiNiiResearchResponse['product'][0]['productIdentifier']
) => {
	const authorProductProductIdentifierColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'product-@id' ||
				column.key.startsWith('product-productIdentifier')
			);
		});
		return result;
	})();

	const getAuthorProductProductIdentifierRows = (
		id: CiNiiResearchResponse['@id'],
		productIdentifier: CiNiiResearchResponse['product'][0]['productIdentifier']
	) => {
		let formattedData = [];
		productIdentifier?.forEach((item) => {
			const row = {
				'@id': id,
				'product-@id': productId,
				'product-productIdentifier-@type': item['@type'],
				'product-productIdentifier-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!productIdentifier) {
			if (formattedData.length) {
				throw new Error('productIdentifierが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'product-@id': productId });
		}
		return formattedData;
	};

	const worksheetName = '成果物-識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorProductProductIdentifierRows(id, productIdentifier);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorProductProductIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorProductProductIdentifierColumnに存在しないキーがあります:${errorColumns}`
		);
	}

	worksheet.columns = authorProductProductIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorProductNotationTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	productId: CiNiiResearchResponse['product'][0]['@id'],
	notation: CiNiiResearchResponse['product'][0]['notation']
) => {
	const authorProductNotationColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'product-@id' ||
				column.key.startsWith('product-notation')
			);
		});
		return result;
	})();

	const getAuthorProductNotationRows = (
		id: CiNiiResearchResponse['@id'],
		notation: CiNiiResearchResponse['product'][0]['notation']
	) => {
		let formattedData = [];
		notation?.forEach((item) => {
			const row = {
				'@id': id,
				'product-@id': productId,
				'product-notation-@language': item['@language'],
				'product-notation-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!notation) {
			if (formattedData.length) {
				throw new Error('notationが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'product-@id': productId });
		}
		return formattedData;
	};

	const worksheetName = '成果物-表記';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorProductNotationRows(id, notation);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorProductNotationColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorProductNotationColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorProductNotationColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorProductRelationParamTables = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	productId: CiNiiResearchResponse['product'][0]['@id'],
	notation: CiNiiResearchResponse['product'][0]['relation']
) => {
	const authorProductRelationParamColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'product-@id' ||
				column.key.startsWith('product-relation')
			);
		});
		return result;
	})();

	const getAuthorProductRelationParamRows = (
		id: CiNiiResearchResponse['@id'],
		relation: CiNiiResearchResponse['product'][0]['relation']
	) => {
		let formattedData = [];
		relation?.forEach((item) => {
			const row = {
				'@id': id,
				'product-@id': productId,
				'product-relation-type': item['type'],
				'product-relation-detail': item['detail'],
			};
			formattedData.push(row);
		});
		if (!relation) {
			if (formattedData.length) {
				throw new Error('relationが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'product-@id': productId });
		}
		return formattedData;
	};

	const worksheetName = '成果物-関連性';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorProductRelationParamRows(id, notation);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorProductRelationParamColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorProductRelationParamColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorProductRelationParamColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorProductRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpProductIdentifier = [];
	const tmpNotation = [];
	const tmpRelationParam = [];

	for await (const item of data) {
		if (item.product) {
			item.product.forEach((product) => {
				tmpProductIdentifier.push({
					id: item['@id'],
					productId: product['@id'],
					productIdentifier: product.productIdentifier ?? [],
				});
				tmpNotation.push({
					id: item['@id'],
					productId: product['@id'],
					notation: product.notation ?? [],
				});
				tmpRelationParam.push({
					id: item['@id'],
					productId: product['@id'],
					relation: product.relation ?? [],
				});
			});
		} else {
			tmpProductIdentifier.push({
				id: item['@id'],
			});
			tmpNotation.push({
				id: item['@id'],
			});
			tmpRelationParam.push({
				id: item['@id'],
			});
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpProductIdentifier) {
		await saveAuthorProductProductIdentifierTable(
			workbook,
			filePath,
			item.id,
			item.productId,
			item.productIdentifier
		);
	}

	for await (const item of tmpNotation) {
		await saveAuthorProductNotationTable(
			workbook,
			filePath,
			item.id,
			item.productId,
			item.notation
		);
	}

	for await (const item of tmpRelationParam) {
		await saveAuthorProductRelationParamTables(
			workbook,
			filePath,
			item.id,
			item.productId,
			item.relation
		);
	}
};

const saveAuthorProductTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const authorProductColumn = (() => {
		const result = authorColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'product-@id' ||
				column.key === 'product-@type' ||
				column.key === 'product-resourceType'
			);
		});
		return result;
	})();

	const getAuthorProductRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item.product?.forEach((product) => {
				const row = {
					'@id': item['@id'],
					'product-@id': product['@id'],
					'product-@type': product['@type'],
					'product-resourceType': product['resourceType'],
				};
				rows.push(row);
			});
			if (!item.product) {
				if (rows.length) {
					throw new Error('productが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = '成果物';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorProductRows(data);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorProductColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorProductColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorProductColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAuthorMainTable = async (workbook: Workbook, data: CiNiiResearchResponse[]) => {
	const authorMainColumns = (() => {
		const result = authorColumns.filter((column) => {
			return !localMaster.arrayDataParams.some((property) => column.key.startsWith(property)); // column.keyを前方一致でチェックする。 元々は→ return !(localMaster.arrayDataParams as readonly string[]).includes(column.key);
		});
		// 念のため：notArrayDataParamsに含まれないプロパティがないかチェック
		result.forEach((column) => {
			if (
				!localMaster.notArrayDataParams.some((property) => column.key.startsWith(property))
			) {
				throw new Error(
					`deepNoArrayPropertiesに含まれないプロパティがあります: ${column.key}`
				);
			}
		});
		return result;
	})();

	/** 第一階層のプロパティのバリューを再起的に確認した際に（事前確認済みの定数がある）、配列の含まれないものを抽出する */
	const getAuthorMainRows = (data: CiNiiResearchResponse[]) => {
		const result = data.map((item) => {
			const newItem = { ...item };
			localMaster.arrayDataParams.forEach((param) => {
				delete newItem[param];
			});
			// itemの全ての要素を確認し、オブジェクトになっていれば、itemのプロパティ名-値のプロパティ名: 値のバリューに変換する
			Object.entries(newItem).forEach(([key, value]) => {
				if (typeof value === 'object') {
					// newItemから削除
					delete newItem[key];

					Object.entries(value).forEach(([subKey, subValue]) => {
						// newItemに追加
						newItem[`${key}${propertySeparator}${subKey}`] = subValue;
					});
				}
			});
			return newItem;
		});
		// console.log(result, null, 2);
		return result;
	};

	const worksheetName = 'Main';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorMainRows(data);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorMainColumns.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`authorMainColumnsに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = authorMainColumns;
	worksheet.addRows(filteredData);
};
const saveAuthorDataSourceIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const authorDataSourceIdentifierColumn = (() => {
		const result = authorColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('dataSourceIdentifier');
		});
		return result;
	})();

	const getAuthorDataSourceIdentifierRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const row = {
				'@id': item['@id'],
				'dataSourceIdentifier-@type': item.dataSourceIdentifier['@type'],
				'dataSourceIdentifier-@value': item.dataSourceIdentifier['@value'],
			};
			formattedData.push(row);
		});
		return formattedData;
	};

	const worksheetName = 'データソース識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorDataSourceIdentifierRows(data);

	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!authorDataSourceIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`authorDataSourceIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = authorDataSourceIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const authorDataToExcel = async (filePath: string, data: CiNiiResearchResponse[]) => {
	const workbook = new Workbook();
	if (existsSync(filePath)) {
		await workbook.xlsx.readFile(filePath);
	}
	await saveAuthorMainTable(workbook, data);
	await saveAuthorPeronIdentifierTable(workbook, filePath, data);
	await saveAuthorFoafPersonRelationTables(workbook, filePath, data);
	await saveAuthorCareerTable(workbook, filePath, data);
	await saveAuthorUrlTable(workbook, filePath, data);
	await saveAuthorUrlRelationTables(workbook, filePath, data);
	await saveAuthorProjectTable(workbook, filePath, data);
	await saveAuthorProjectRelationTables(workbook, filePath, data);
	await saveAuthorProductTable(workbook, filePath, data);
	await saveAuthorProductRelationTables(workbook, filePath, data);
	await saveAuthorDataSourceIdentifierTable(workbook, filePath, data);
	await workbook.xlsx.writeFile(filePath);
};

// const convertAuthorNDJSONToExcel = async (year: number) => {
const convertAuthorNDJSONToExcel = async (year: number) => {
	const maxOneFileItems = 5000;
	const filePathPrefix = `${dirPrefix}/_tmp_jsonl_to_xlsx/`;
	// await resetAppendFile(filePath);

	const pipeline: Chain = chain([
		createReadStream(`${dirPrefix}/4_author_detail/${year}_2_target_author_details.jsonl`),
		withParser(),
	]);

	if (false) {
		for await (const item of pipeline) {
			Object.keys(item.value).forEach((key) => {
				console.log(key);
			});
		}
	}

	// if (false) {
	let items: CiNiiResearchResponse[] = [];
	let filePathState = `${filePathPrefix}${year}_0_authors.xlsx`;
	for await (const item of pipeline) {
		items.push(item.value);

		// item.valueのプロパティとauthorColumnsのkeyが一致しeない場合はconsoleに出力しておく
		const errorColumns: string[] = [];
		Object.keys(item.value).map((key) => {
			if (!checkAuthorColumns.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
		if (errorColumns.length) {
			throw new Error(`checkAuthorColumnsに存在しないキーがあります: ${errorColumns}`);
		}

		if (items.length >= 10) {
			let fileNumber = Math.floor(item.key / maxOneFileItems);
			if (year === 2023 && fileNumber === 2) {
				if (item.key > 12500) {
					fileNumber = 3;
				}
			}
			if (year === 2022 && fileNumber === 2) {
				if (item.key > 12500) {
					fileNumber = 3;
				}
			}
			if (fileNumber === 0 || fileNumber === 1 || fileNumber === 2) {
				continue;
			}
			fileNumber = Math.floor(item.key / 1000);
			const filePath = `${filePathPrefix}${year}_${fileNumber}_authors.xlsx`;
			filePathState = filePath;
			await authorDataToExcel(filePath, items);
			items = [];
			await setTimeout(1000);
		}

		await setTimeout(100);
	}

	if (items.length) {
		await authorDataToExcel(filePathState, items);
		await setTimeout(100);
	}
	// }
};

(async () => {
	for await (const year of [2023]) {
		await convertAuthorNDJSONToExcel(year);
		console.log(`${year}: done`);
	}
})();
// const masterMainColumns = [
// 	{ key: '@context', header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}@vocab`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}rdfs`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}dc`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}dcterms`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}foaf`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}prism`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}cinii`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}datacite`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}ndl`, header: 'コンテキスト' },
// 	// { key: `@context${propertySeparator}jpcoar`, header: 'コンテキスト' },
// 	{ key: '@id', header: '1.CiNiiResearchのID' },
// 	{ key: '@type', header: '1.データ種別' },
// 	{ key: 'projectIdentifier', header: '2.CiNiiResearch外部の識別子' },
// 	{ key: 'personIdentifier', header: '3.CiNiiResearch外部の識別子' },
// 	{ key: 'productIdentifier', header: '4.CiNiiResearch外部の識別子' },
// 	{ key: 'resourceType', header: '5.資源種別' },
// 	{ key: 'dc:title', header: '6.タイトル' },
// 	{ key: 'jpcoar:awardTitle', header: '6.タイトル（プロジェクト）' },
// 	{ key: 'dcterms:alternative', header: '6.その他のタイトル' },
// 	{ key: 'foaf:Person', header: '7.氏名' },
// 	{ key: 'career', header: '8.所属' },
// 	{ key: 'field', header: '9.審査区分/研究分野' },
// 	{ key: 'dc:language', header: '10.言語' },
// 	{ key: 'description', header: '11.概要(抄録)' },
// 	{ key: 'researcher', header: '12.研究者' },
// 	{ key: 'since', header: '13.開始日' },
// 	{ key: 'until', header: '14.終了日' },
// 	{ key: 'institution', header: '15.研究機関' },
// 	{ key: 'fundingProgram', header: '16.助成機関' },
// 	{ key: 'creator', header: '17.著者' },
// 	{ key: 'contributor', header: '18.寄与者' },
// 	{ key: 'publication', header: '19.掲載誌' },
// 	{ key: 'reviewed', header: '19.査読の有無' },
// 	{ key: 'dcterms:accessRights', header: '19.オープンアクセスの有無' },
// 	{ key: 'ndl:dissertationNumber', header: '20.学位授与番号' },
// 	{ key: 'ndl:dateGranted', header: '20.学位授与年月日' },
// 	{ key: 'ndl:degreeName', header: '20.学位名' },
// 	{ key: 'degreeAwardInstitution', header: '20.学位授与機関' },
// 	{ key: 'jpcoar:conferenceName', header: '21.学会または会議名' },
// 	{ key: 'jpcoar:conferencePlace', header: '21.開催地' },
// 	{ key: 'jpcoar:conferenceDate', header: '21.開催期間' },
// 	{
// 		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:startDay`,
// 		header: '21.開催期間-開始日',
// 	},
// 	{
// 		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:startMonth`,
// 		header: '21.開催期間-開始月',
// 	},
// 	{
// 		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:startYear`,
// 		header: '21.開催期間-開始年',
// 	},
// 	{ key: `jpcoar:conferenceDate${propertySeparator}jpcoar:endDay`, header: '21.開催期間-終了年' },
// 	{
// 		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:endMonth`,
// 		header: '21.開催期間-終了年',
// 	},
// 	{
// 		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:endYear`,
// 		header: '21.開催期間-終了年',
// 	},
// 	{ key: 'jpcoar:conferenceSponsor', header: '21.主催者' },
// 	{ key: 'invited', header: '21.招待の有無' },
// 	{ key: 'prism:edition', header: '22.版' },
// 	{ key: 'printing', header: '22.刷' },
// 	{ key: 'dc:date', header: '22.出版年月日' },
// 	{ key: 'dcterms:medium', header: '22.出版種別コード' },
// 	{
// 		key: `dcterms:medium${propertySeparator}generalMaterialDesignationCode`,
// 		header: '22.一般資料種別コード',
// 	},
// 	{
// 		key: `dcterms:medium${propertySeparator}specificMaterialDesignationCode`,
// 		header: '22.特定資料種別コード',
// 	},
// 	{ key: 'dc:creator', header: '22.責任表示' },
// 	{ key: 'publicationCountryCode', header: '22.出版国コード' },
// 	{ key: 'dcterms:publisher', header: '22.出版情報' },
// 	{ key: 'dc:subject', header: '22.分類' },
// 	{ key: 'cinii:size', header: '22.大きさ、版型' },
// 	{ key: 'dcterms:extent', header: '22.ページ数' },
// 	{ key: 'publicationStatusCode', header: '22.出版状況コード' },
// 	{ key: 'publicationPeriodicityCode', header: '22.刊行頻度コード' },
// 	{ key: 'publicationRegularityCode', header: '22.定期性コード' },
// 	{ key: 'serialsTypeCode', header: '22.逐次刊行物のタイプコード' },
// 	{ key: 'jpcoar:extent', header: '23.サイズ' },
// 	{ key: 'format', header: '24.フォーマット' },
// 	{ key: 'datacite:version', header: '25.バージョン' },
// 	{ key: 'dc:rights', header: '26.著作権' },
// 	{ key: 'url', header: '27.URL' },
// 	{ key: 'createdAt', header: '28.公開日' },
// 	{ key: 'modifiedAt', header: '29.最終更新日' },
// 	{ key: 'foaf:topic', header: '30.キーワード' },
// 	{ key: 'dcterms:subject', header: '30.件名' },
// 	{ key: 'cinii:note', header: '31.注記' },
// 	{ key: 'project', header: '32.プロジェクト（研究課題）' },
// 	{ key: 'relatedProject', header: '33.関連プロジェクト' },
// 	{ key: 'product', header: '34.成果物' },
// 	{ key: 'relatedProduct', header: '35/関連成果物' },
// 	{ key: 'dataSourceIdentifier', header: '36.データソース識別子' },
// 	{ key: 'dcterms:tableOfContents', header: '37.目次' },
// 	{ key: 'grant', header: '38.助成プログラム' },
// 	{ key: 'allocationClassification', header: '39.配分区分' },
// 	{ key: 'allocationAmount', header: '40.配分額' },
// 	{ key: 'projectStatus', header: '-.プロジェクト状況' },
// ] satisfies { key: keyof CiNiiResearchResponse | string; header: string }[];

// type ElementOf<A extends any[]> = A extends (infer Elm)[] ? Elm : unknown;
// type IsNever<T> = T[] extends never[] ? true : false;

// function allElements<V>(): <Arr extends V[]>(
// 	arr: Arr
// ) => IsNever<Exclude<V, ElementOf<Arr>>> extends true ? V[] : unknown {
// 	return (arr) => arr as any;
// }

// 文字列型になっているプロパティ
// const stringProperties = (): (keyof CiNiiResearchResponse)[] => {
// 	type StringPropertyNames<T> = {
// 		[K in keyof T]: T[K] extends string ? K : never;
// 	}[keyof T];

// 	type test = StringPropertyNames<CiNiiResearchResponse>;

// 	const result = allElements<StringPropertyNames<CiNiiResearchResponse>>()([
// 		'@context',
// 		'@id',
// 		'@type',
// 		'resourceType',
// 		'dc:language',
// 		'since',
// 		'until',
// 		'reviewed',
// 		'dcterms:accessRights',
// 		'ndl:dissertationNumber',
// 		'ndl:dateGranted',
// 		'ndl:degreeName',
// 		'jpcoar:conferenceName',
// 		'jpcoar:conferencePlace',
// 		'jpcoar:conferenceSponsor',
// 		'invited',
// 		'prism:edition',
// 		'printing',
// 		'dc:date',
// 		'dc:creator',
// 		'publicationCountryCode',
// 		'cinii:size',
// 		'dcterms:extent',
// 		'publicationStatusCode',
// 		'publicationPeriodicityCode',
// 		'publicationRegularityCode',
// 		'serialsTypeCode',
// 		'datacite:version',
// 		'createdAt',
// 		'modifiedAt',
// 		'allocationAmount',
// 		'projectStatus',
// 	]);

// 	return result;
// };

/** Memo FoafTopicDcTitleは元々配列の想定 */
// const saveAuthorFoafTopicDcTitleTable = async (
// 	workbook: Workbook,
// 	filePath: string,
// 	id: CiNiiResearchResponse['@id'],
// 	foafTopicId: CiNiiResearchResponse['foaf:topic'][0]['@id'],
// 	dcTitle: CiNiiResearchResponse['foaf:topic'][0]['dc:title']
// ) => {
// 	const authorFoafTopicDcTitleColumn = (() => {
// 		const result = authorColumns.filter((column) => {
// 			return (
// 				column.key === '@id' ||
// 				column.key === 'foaf:topic-@id' ||
// 				column.key.startsWith('foaf:topic-dc:title')
// 			);
// 		});
// 		return result;
// 	})();

// 	const getAuthorFoafTopicDcTitleRows = (
// 		id: CiNiiResearchResponse['@id'],
// 		dcTitle: CiNiiResearchResponse['foaf:topic'][0]['dc:title']
// 	) => {
// 		let formattedData = [];
// 		dcTitle?.forEach((item) => {
// 			const rows = [];
// 			const row = {
// 				'@id': id,
// 				'foaf:topic-@id': foafTopicId,
// 				'foaf:topic-dc:title-@language': item['@language'],
// 				'foaf:topic-dc:title-@value': item['@value'],
// 			};
// 			rows.push(row)

// 			formattedData = [...formattedData, ...rows];
// 		});
// 		if (!dcTitle) {
// 			if (formattedData.length) {
// 				throw new Error('dcTitleが存在しないのにrowsが存在します');
// 			}
// 			formattedData.push({ '@id': id, 'foaf:topic-@id': foafTopicId });
// 		}
// 		return formattedData;
// 	};

// 	const worksheetName = 'トピック-タイトル';
// 	let worksheet;

// 	if (existsSync(filePath)) {
// 		await workbook.xlsx.readFile(filePath);
// 	}
// 	worksheet = existsWorksheet(workbook, worksheetName)
// 		? workbook.getWorksheet(worksheetName)
// 		: workbook.addWorksheet(worksheetName);

// 	const filteredData = getAuthorFoafTopicDcTitleRows(id, dcTitle);

// 	// もしauthorMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
// 	let errorColumns: string[] = [];
// 	filteredData.forEach((item) => {
// 		Object.keys(item).map((key) => {
// 			if (!authorFoafTopicDcTitleColumn.some((column) => column.key === key)) {
// 				errorColumns.push(key);
// 			}
// 		});
// 	});
// 	if (errorColumns.length) {
// 		throw new Error(
// 			`authorFoafTopicDcTitleColumnに存在しないキーがあります: ${errorColumns}`
// 		);
// 	}

// 	worksheet.columns = authorFoafTopicDcTitleColumn;
// 	worksheet.addRows(filteredData);

// 	// await workbook;
// }

// const saveAuthorFoafTopicRelationTables = async (
// 	workbook: Workbook,
// 	filePath: string,
// 	data: CiNiiResearchResponse[]
// ) => {
// 	const tmpDcTitle = [];

// 	for await (const item of data) {
// 		if (item['foaf:topic']) {
// 			for (const foafTopic of item['foaf:topic']) {
// 				tmpDcTitle.push({
// 					id: item['@id'],
// 					foafTopicId: foafTopic['@id'],
// 					dcTitle: foafTopic['dc:title'] ?? [],
// 				});
// 			}
// 		}
// 	}

// 	// 一度に処理するプロミスの数を制限するロジックをここに実装

// 	for await (const item of tmpDcTitle) {
// 		await saveAuthorFoafTopicDcTitleTable(
// 			workbook,
// 			filePath,
// 			item.id,
// 			item.foafTopicId,
// 			item.dcTitle
// 		);
// 	}
// }
