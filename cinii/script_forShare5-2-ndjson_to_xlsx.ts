// docker compose exec node ./cinii/node_modules/.bin/ts-node ./cinii/script_forShare5-2-ndjson_to_xlsx.ts
import { Workbook } from 'exceljs';
import { createReadStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import Chain, { chain } from 'stream-chain';
import { withParser } from 'stream-json/streamers/StreamValues';
import { setTimeout } from 'timers/promises';
import { CiNiiResearchResponse } from './interfaces/cinii_research_response';

const dirPrefix = 'cinii';
const propertySeparator = '-';

// const foafPersonArrayParam = ['foaf:name', 'foaf:familyName', 'foaf:givenName', 'foaf:middleName'];

// const careerArrayParam = [
// 	'institution', // institutionIdentifier, notation
// 	'department', // departmentIdentifier, notation
// 	'jobTitle', // jobTitleIdentifier, notation
// ];

// const fieldArrayParam = [
// 	'keyword', // textList
// ];

// const descriptionArrayParam = ['notation'];

// const researcherArrayParam = ['personIdentifier', 'name', 'affiliation'];

// const institutionArrayParam = ['institutionIdentifier', 'notation'];

// const fundingProgramArrayParam = ['notation'];

// const creatorArrayParam = ['personIdentifier', 'foaf:name', 'jpcoar:affiliationName'];

// const contributorArrayParam = ['personIdentifier', 'foaf:name', 'jpcoar:affiliationName'];

// const publicationArrayParam = ['publicationIdentifier', 'prism:publicationName', 'dc:publisher'];

// const degreeAwardInstitutionArrayParam = ['institutionIdentifier', 'jpcoar:degreeGrantorName'];

// const urlArrayParam = ['notation'];

// const foafTopicArrayParam = ['dc:title'];

// const dctermsSubjectArrayParam = ['notation'];

// const projectArrayParam = ['projectIdentifier', 'notation'];

// const relatedProjectArrayParam = ['projectIdentifier', 'notation'];

// const productArrayParam = ['productIdentifier', 'notation'];

// const relatedProductArrayParam = ['productIdentifier', 'relationType', 'relationType'];

// const dctermsTableOfContentsArrayParam = ['dcterms:title'];

// const grantArrayParam = ['grantIdentifier', 'jpcoar:fundingStream'];

// const allocationClassificationArrayParam = [
// 	'breakdownCost', // notation
// ];

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

const articleColumns = [
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
	{ key: 'productIdentifier-identifier-@type', header: '4.識別子タイプ' },
	{ key: 'productIdentifier-identifier-@value', header: '4.コード値' },
	{ key: 'productIdentifier-extra-type', header: '4.拡張項目タイプ' },
	{ key: 'productIdentifier-extra-value', header: '4.拡張項目値' },
	{ key: 'resourceType', header: '5.資源種別' },
	{ key: 'dc:title-@language', header: '6.タイトル' },
	{ key: 'dc:title-@value', header: '6.タイトル' },
	{ key: 'dcterms:alternative-@language', header: '6.その他のタイトル(言語種別)' },
	{ key: 'dcterms:alternative-@value', header: '6.その他のタイトル' },
	{ key: 'dc:language', header: '10.言語' },
	{ key: 'description-type', header: '11.概要(抄録)-種別' },
	{ key: 'description-notation-@language', header: '11.概要(抄録)-表記(言語種別)' },
	{ key: 'description-notation-@value', header: '11.概要(抄録)-表記' },
	{ key: 'description-abstractLicenseFlag-@value', header: '11.概要(抄録)-ライセンスフラグ' },
	{ key: 'creator-@id', header: '17.著者-CiNiiResearchにおけるID' },
	{ key: 'creator-@type', header: '17.著者-成果物における種別' },
	{ key: 'creator-personIdentifier-@type', header: '17.著者-識別子タイプ' },
	{ key: 'creator-personIdentifier-@value', header: '17.著者-コード値' },
	{ key: 'creator-foaf:name-@language', header: '17.著者-氏名(言語種別)' },
	{ key: 'creator-foaf:name-@value', header: '17.著者-氏名' },
	{ key: 'creator-jpcoar:affiliationName-@language', header: '17.著者-所属(言語種別)' },
	{ key: 'creator-jpcoar:affiliationName-@value', header: '17.著者-所属' },
	{ key: 'contributor-@id', header: '18.寄与者-CiNiiResearchにおけるID' },
	{ key: 'contributor-@type', header: '18.寄与者-成果物における種別' },
	{ key: 'contributor-personIdentifier-@type', header: '18.寄与者-識別子タイプ' },
	{ key: 'contributor-personIdentifier-@value', header: '18.寄与者-コード値' },
	{ key: 'contributor-foaf:name-@language', header: '18.寄与者-氏名(言語種別)' },
	{ key: 'contributor-foaf:name-@value', header: '18.寄与者-氏名' },
	{ key: 'contributor-jpcoar:affiliationName-@language', header: '18.寄与者-所属(言語種別)' },
	{ key: 'contributor-jpcoar:affiliationName-@value', header: '18.寄与者-所属' },
	{ key: 'publication-publicationIdentifier-@type', header: '19.掲載誌-識別子タイプ' },
	{ key: 'publication-publicationIdentifier-@value', header: '19.掲載誌-コード値' },
	{ key: 'publication-prism:publicationName-@language', header: '19.掲載誌-タイトル(言語種別)' },
	{ key: 'publication-prism:publicationName-@value', header: '19.掲載誌-タイトル' },
	{ key: 'publication-dc:publisher-@language', header: '19.掲載誌-出版社(言語種別)' },
	{ key: 'publication-dc:publisher-@value', header: '19.掲載誌-出版社' },
	{ key: 'publication-prism:publicationDate', header: '19.掲載誌-出版年月日' },
	{ key: 'publication-prism:volume', header: '19.掲載誌-巻' },
	{ key: 'publication-prism:number', header: '19.掲載誌-号' },
	{ key: 'publication-prism:startingPage', header: '19.掲載誌-開始ページ' },
	{ key: 'publication-prism:endingPage', header: '19.掲載誌-終了ページ' },
	{ key: 'publication-jpcoar:numPages', header: '19.掲載誌-ページ数' },
	{ key: 'publication-foreign', header: '19.掲載誌-国際誌の有無' },
	{ key: 'publication-jointInternationalResearch', header: '19.国際共著の有無' },
	{ key: 'reviewed', header: '19.査読の有無' },
	{ key: 'dcterms:accessRights', header: '19.オープンアクセスの有無' },
	{ key: 'jpcoar:conferenceName', header: '21.学会または会議名' },
	{ key: 'jpcoar:conferencePlace', header: '21.開催地' },
	{
		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:startDay`,
		header: '21.開催期間-開始日',
	},
	{
		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:startMonth`,
		header: '21.開催期間-開始月',
	},
	{
		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:startYear`,
		header: '21.開催期間-開始年',
	},
	{ key: `jpcoar:conferenceDate${propertySeparator}jpcoar:endDay`, header: '21.開催期間-終了年' },
	{
		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:endMonth`,
		header: '21.開催期間-終了年',
	},
	{
		key: `jpcoar:conferenceDate${propertySeparator}jpcoar:endYear`,
		header: '21.開催期間-終了年',
	},
	{ key: 'jpcoar:conferenceSponsor', header: '21.主催者' },
	{ key: 'invited', header: '21.招待の有無' },
	{ key: 'datacite:version', header: '25.バージョン' },
	{ key: 'dc:rights-elm', header: '26.著作権-表記' },
	{ key: 'url-@id', header: '27.URL' },
	{ key: 'url-notation-@language', header: '27.URL-表記(言語種別)' },
	{ key: 'url-notation-@value', header: '27.URL-表記' },
	{ key: 'createdAt', header: '28.公開日' },
	{ key: 'modifiedAt', header: '29.最終更新日' },
	{ key: 'foaf:topic-@id', header: '30.キーワード-CiNiiResearchにおけるID' },
	{ key: 'foaf:topic-dc:title', header: '30.キーワード-表記' },
	{ key: 'project-@id', header: '32.プロジェクト-CiNiiResearchにおけるID' },
	{ key: 'project-@type', header: '32.プロジェクト-成果物における種別' },
	{ key: 'project-projectIdentifier-@type', header: '32.プロジェクト-識別子タイプ' },
	{ key: 'project-projectIdentifier-@value', header: '32.プロジェクト-コード値' },
	{ key: 'project-notation-@language', header: '32.プロジェクト-表記(言語種別)' },
	{ key: 'project-notation-@value', header: '32.プロジェクト-表記' },
	{ key: 'project-role', header: '32.プロジェクト-本研究における役割' },
	{ key: 'relatedProduct-@id', header: '35/関連成果物-CiNiiResearchにおけるID' },
	{ key: 'relatedProduct-@type', header: '35/関連成果物-成果物における種別' },
	{ key: 'relatedProduct-productIdentifier-@type', header: '35/関連成果物-識別子タイプ' },
	{ key: 'relatedProduct-productIdentifier-@value', header: '35/関連成果物-コード値' },
	{ key: 'relatedProduct-resourceType', header: '35/関連成果物-資源種別' },
	{ key: 'relatedProduct-relationType', header: '35/関連成果物-関連種別' },
	{
		key: 'relatedProduct-jpcoar:relatedTitle-@language',
		header: '35/関連成果物-タイトル(言語種別)',
	},
	{ key: 'relatedProduct-jpcoar:relatedTitle-@value', header: '35/関連成果物-タイトル' },
	{ key: 'dataSourceIdentifier-@type', header: '36.データソース識別子-識別子タイプ' },
	{ key: 'dataSourceIdentifier-@value', header: '36.データソース識別子-コード値' },
] as const satisfies readonly { key: keyof CiNiiResearchResponse | string; header: string }[];

// 出力だけだといらないやつ。判定に使う
const articleColumns2 = [
	{ key: '@context', header: 'コンテキスト' },
	{ key: '@id', header: '1.CiNiiResearchのID' },
	{ key: '@type', header: '1.データ種別' },
	{ key: 'productIdentifier', header: '4.CiNiiResearch外部の識別子' },
	{ key: 'resourceType', header: '5.資源種別' },
	{ key: 'dc:title', header: '6.タイトル' },
	{ key: 'dcterms:alternative', header: '6.その他のタイトル' },
	{ key: 'dc:language', header: '10.言語' },
	{ key: 'description', header: '11.概要(抄録)' },
	{ key: 'creator', header: '17.著者' },
	{ key: 'contributor', header: '18.寄与者' },
	{ key: 'publication', header: '19.掲載誌' },
	{ key: 'reviewed', header: '19.査読の有無' },
	{ key: 'dcterms:accessRights', header: '19.オープンアクセスの有無' },
	{ key: 'jpcoar:conferenceName', header: '21.学会または会議名' },
	{ key: 'jpcoar:conferencePlace', header: '21.開催地' },
	{ key: 'jpcoar:conferenceDate', header: '21.開催期間' },
	{ key: 'jpcoar:conferenceSponsor', header: '21.主催者' },
	{ key: 'invited', header: '21.招待の有無' },
	{ key: 'datacite:version', header: '25.バージョン' },
	{ key: 'dc:rights', header: '26.著作権' },
	{ key: 'url', header: '27.URL' },
	{ key: 'createdAt', header: '28.公開日' },
	{ key: 'modifiedAt', header: '29.最終更新日' },
	{ key: 'foaf:topic', header: '30.キーワード' },
	{ key: 'project', header: '32.プロジェクト（研究課題）' },
	{ key: 'relatedProduct', header: '35/関連成果物' },
	{ key: 'dataSourceIdentifier', header: '36.データソース識別子' },
];

const saveArticleMainTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	/** 第一階層のプロパティのバリューを再起的に確認した際に（事前確認済みの定数がある）、配列の含まれないものを抽出する */
	const articleMainColumns = (() => {
		const result = articleColumns.filter((column) => {
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
	const getArticleMainRows = (data: CiNiiResearchResponse[]) => {
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

	if (existsSync(filePath)) {
		worksheet = workbook.getWorksheet(worksheetName);
	} else {
		worksheet = workbook.addWorksheet(worksheetName);
	}

	const filteredData = getArticleMainRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleMainColumns.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleMainColumnsに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleMainColumns;
	worksheet.addRows(filteredData);
};

const existsWorksheet = (workbook: Workbook, worksheetName: string) => {
	return workbook.worksheets.some((worksheet) => worksheet.name === worksheetName);
};

const saveArticleProductIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	/** キーが@idまたはキーのプレフィックスがproductIdentifierのものを抽出する **/
	const articleProductIdentifierColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('productIdentifier');
		});
		return result;
	})();

	const getArticleProductIdentifierRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item.productIdentifier?.forEach((identifier) => {
				const row = {
					'@id': item['@id'],
					'productIdentifier-identifier-@type': identifier.identifier['@type'],
					'productIdentifier-identifier-@value': identifier.identifier['@value'],
					// NOTE: 配列の可能性あり
					'productIdentifier-extra-type': identifier.extra?.type,
					'productIdentifier-extra-value': identifier.extra?.value,
				};
				rows.push(row);
			});
			if (!item.productIdentifier) {
				if (rows.length) {
					throw new Error('productIdentifierが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = 'CiNii外部の識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleProductIdentifierRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleProductIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleProductIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleProductIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook.xlsx.writeFile(filePath);
};

const saveArticleTitleTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	/** キーが@idまたはキーのプレフィックスがproductIdentifierのものを抽出する **/
	const articleTitleColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key.startsWith('dc:title') ||
				column.key.startsWith('dcterms:alternative')
			);
		});
		return result;
	})();

	/** TODO: 一つにまとめちゃってもいいかも */
	const getArticleTitleRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const dcTitleRows = [];
			item['dc:title']?.forEach((title) => {
				const row = {
					'@id': item['@id'],
					'dc:title-@language': title['@language'],
					'dc:title-@value': title['@value'],
				};
				dcTitleRows.push(row);
			});
			if (!item['dc:title']) {
				if (dcTitleRows.length) {
					throw new Error('dc:titleが存在しないのにrowsが存在します');
				}
				dcTitleRows.push({ '@id': item['@id'] });
			}

			const alternativeRows = [];
			item['dcterms:alternative']?.forEach((alternative) => {
				const row = {
					'@id': item['@id'],
					'dcterms:alternative-@language': alternative['@language'],
					'dcterms:alternative-@value': alternative['@value'],
				};
				alternativeRows.push(row);
			});
			if (!item['dcterms:alternative']) {
				if (alternativeRows.length) {
					throw new Error('dcterms:alternativeが存在しないのにrowsが存在します');
				}
				alternativeRows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...dcTitleRows, ...alternativeRows];
		});
		return formattedData;
	};
	const worksheetName = 'タイトル';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleTitleRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleTitleColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleProductIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleTitleColumn;
	worksheet.addRows(filteredData);

	// await workbook.xlsx.writeFile(filePath);
};

const saveArticleDescriptionTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleDescriptionColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('description');
		});
		return result;
	})();

	const getArticleDescriptionRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item.description?.forEach((description) => {
				description.notation?.forEach((notation) => {
					const row = {
						'@id': item['@id'],
						'description-type': description?.type,
						'description-notation-@language': notation?.['@language'],
						'description-notation-@value': notation?.['@value'],
						'description-abstractLicenseFlag-@value':
							description.abstractLicenseFlag?.['@value'],
					};
					rows.push(row);
				});

				if (!item.description) {
					// もしtypeやabstractLicenseFlagが存在すれば例外
					if (description?.type || description?.abstractLicenseFlag?.['@value']) {
						throw new Error(
							'descriptionが存在しないのに種別やライセンスフラグが存在します'
						);
					}
				}
			});
			if (!item.description) {
				if (rows.length) {
					throw new Error('descriptionが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = '概要(抄録)';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleDescriptionRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleDescriptionColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleDescriptionColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleDescriptionColumn;
	worksheet.addRows(filteredData);

	// await workbook.xlsx.writeFile(filePath);
};

const saveArticleCreatorPersonIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	creatorId: CiNiiResearchResponse['creator'][0]['@id'],
	data: CiNiiResearchResponse['creator'][0]['personIdentifier']
) => {
	const articleCreatorPersonIdentifierColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'creator-@id' ||
				column.key.startsWith('creator-personIdentifier')
			);
		});
		return result;
	})();

	const getArticleCreatorPersonIdentifierRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['creator'][0]['personIdentifier']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'creator-@id': creatorId,
				'creator-personIdentifier-@type': item['@type'],
				'creator-personIdentifier-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error('creator-personIdentifierが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '著者-CiNiiResearch外部の識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleCreatorPersonIdentifierRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleCreatorPersonIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleCreatorPersonIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleCreatorPersonIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook.xlsx.writeFile(filePath);
};

const saveArticleCreatorFoafNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	creatorId: CiNiiResearchResponse['creator'][0]['@id'],
	data: CiNiiResearchResponse['creator'][0]['foaf:name']
) => {
	const articleCreatorFoafNameColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'creator-@id' ||
				column.key.startsWith('creator-foaf:name')
			);
		});
		return result;
	})();

	const getArticleCreatorFoafNameRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['creator'][0]['foaf:name']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'creator-@id': creatorId,
				'creator-foaf:name-@language': item['@language'],
				'creator-foaf:name-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error('creator-foaf:nameが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '著者-氏名';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleCreatorFoafNameRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleCreatorFoafNameColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleCreatorFoafNameColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleCreatorFoafNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleCreatorJpcoarAffiliationNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	creatorId: CiNiiResearchResponse['creator'][0]['@id'],
	data: CiNiiResearchResponse['creator'][0]['jpcoar:affiliationName']
) => {
	const articleCreatorJpcoarAffiliationNameColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'creator-@id' ||
				column.key.startsWith('creator-jpcoar:affiliationName')
			);
		});
		return result;
	})();

	const getArticleCreatorJpcoarAffiliationNameRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['creator'][0]['jpcoar:affiliationName']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'creator-@id': creatorId,
				'creator-jpcoar:affiliationName-@language': item['@language'],
				'creator-jpcoar:affiliationName-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error('creator-jpcoar:affiliationNameが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '著者-所属';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleCreatorJpcoarAffiliationNameRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleCreatorJpcoarAffiliationNameColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleCreatorJpcoarAffiliationNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleCreatorJpcoarAffiliationNameColumn;
	worksheet.addRows(filteredData);

	// await workbook.xlsx.writeFile(filePath);
};

/** TODO からの場合のID列の保存 */
const saveCreatorRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpContributorPersonIdentifier = [];
	const tmpFoafName = [];
	const tmpJpcoarAffiliationName = [];

	for await (const item of data) {
		if (item.creator) {
			for (const creator of item.creator) {
				tmpContributorPersonIdentifier.push({
					id: item['@id'],
					creatorId: creator['@id'],
					personIdentifier: creator['personIdentifier'] ?? [],
				});
				tmpFoafName.push({
					id: item['@id'],
					creatorId: creator['@id'],
					foafName: creator['foaf:name'] ?? [],
				});
				tmpJpcoarAffiliationName.push({
					id: item['@id'],
					creatorId: creator['@id'],
					jpcoarAffiliationName: creator['jpcoar:affiliationName'] ?? [],
				});
			}
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpContributorPersonIdentifier) {
		await saveArticleCreatorPersonIdentifierTable(
			workbook,
			filePath,
			item.id,
			item.creatorId,
			item.personIdentifier
		);
	}

	for await (const item of tmpFoafName) {
		await saveArticleCreatorFoafNameTable(
			workbook,
			filePath,
			item.id,
			item.creatorId,
			item.foafName
		);
	}

	for await (const item of tmpJpcoarAffiliationName) {
		await saveArticleCreatorJpcoarAffiliationNameTable(
			workbook,
			filePath,
			item.id,
			item.creatorId,
			item.jpcoarAffiliationName
		);
	}
};

const saveArticleCreatorTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleCreatorColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'creator-@id' ||
				column.key === 'creator-@type'
			);
		});
		return result;
	})();

	const getArticleCreatorRows = async (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		for await (const item of data) {
			const rows = [];
			item.creator?.forEach((creator) => {
				const row = {
					'@id': item['@id'],
					'creator-@id': creator['@id'],
					'creator-@type': creator['@type'],
				};
				rows.push(row);
			});

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

	const worksheetName = '著者';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

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
};

const saveArticleContributorPersonIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	contributorId: CiNiiResearchResponse['contributor'][0]['@id'],
	data: CiNiiResearchResponse['contributor'][0]['personIdentifier']
) => {
	const articleContributorPersonIdentifierColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'contributor-@id' ||
				column.key.startsWith('contributor-personIdentifier')
			);
		});
		return result;
	})();

	const getArticleContributorPersonIdentifierRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['contributor'][0]['personIdentifier']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'contributor-@id': contributorId,
				'contributor-personIdentifier-@type': item['@type'],
				'contributor-personIdentifier-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error('contributor-personIdentifierが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '寄与者-CiNiiResearch外部の識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleContributorPersonIdentifierRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleContributorPersonIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleContributorPersonIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleContributorPersonIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleContributorFoafNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	contributorId: CiNiiResearchResponse['contributor'][0]['@id'],
	data: CiNiiResearchResponse['contributor'][0]['foaf:name']
) => {
	const articleContributorFoafNameColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'contributor-@id' ||
				column.key.startsWith('contributor-foaf:name')
			);
		});
		return result;
	})();

	const getArticleContributorFoafNameRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['contributor'][0]['foaf:name']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'contributor-@id': contributorId,
				'contributor-foaf:name-@language': item['@language'],
				'contributor-foaf:name-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error('contributor-foaf:nameが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '寄与者-氏名';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleContributorFoafNameRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleContributorFoafNameColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleContributorFoafNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleContributorFoafNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleContributorJpcoarAffiliationNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	contributorId: CiNiiResearchResponse['contributor'][0]['@id'],
	data: CiNiiResearchResponse['contributor'][0]['jpcoar:affiliationName']
) => {
	const articleContributorJpcoarAffiliationNameColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'contributor-@id' ||
				column.key.startsWith('contributor-jpcoar:affiliationName')
			);
		});
		return result;
	})();

	const getArticleContributorJpcoarAffiliationNameRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['contributor'][0]['jpcoar:affiliationName']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'contributor-@id': contributorId,
				'contributor-jpcoar:affiliationName-@language': item['@language'],
				'contributor-jpcoar:affiliationName-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error(
					'contributor-jpcoar:affiliationNameが存在しないのにrowsが存在します'
				);
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '寄与者-所属';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleContributorJpcoarAffiliationNameRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!articleContributorJpcoarAffiliationNameColumn.some((column) => column.key === key)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleContributorJpcoarAffiliationNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleContributorJpcoarAffiliationNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleContributorRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpContributorPersonIdentifier = [];
	const tmpFoafName = [];
	const tmpJpcoarAffiliationName = [];

	for await (const item of data) {
		if (item.contributor) {
			for (const contributor of item.contributor) {
				tmpContributorPersonIdentifier.push({
					id: item['@id'],
					contributorId: contributor['@id'],
					personIdentifier: contributor['personIdentifier'] ?? [],
				});
				tmpFoafName.push({
					id: item['@id'],
					contributorId: contributor['@id'],
					foafName: contributor['foaf:name'] ?? [],
				});
				tmpJpcoarAffiliationName.push({
					id: item['@id'],
					contributorId: contributor['@id'],
					jpcoarAffiliationName: contributor['jpcoar:affiliationName'] ?? [],
				});
			}
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpContributorPersonIdentifier) {
		await saveArticleContributorPersonIdentifierTable(
			workbook,
			filePath,
			item.id,
			item.contributorId,
			item.personIdentifier
		);
	}

	for await (const item of tmpFoafName) {
		await saveArticleContributorFoafNameTable(
			workbook,
			filePath,
			item.id,
			item.contributorId,
			item.foafName
		);
	}

	for await (const item of tmpJpcoarAffiliationName) {
		await saveArticleContributorJpcoarAffiliationNameTable(
			workbook,
			filePath,
			item.id,
			item.contributorId,
			item.jpcoarAffiliationName
		);
	}
};

const saveArticleContributorTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleContributorColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'contributor-@id' ||
				column.key === 'contributor-@type'
			);
		});
		return result;
	})();

	const getArticleContributorRows = async (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		for await (const item of data) {
			const rows = [];
			item.contributor?.forEach((contributor) => {
				const row = {
					'@id': item['@id'],
					'contributor-@id': contributor['@id'],
					'contributor-@type': contributor['@type'],
				};
				rows.push(row);
			});

			if (!item.contributor) {
				if (rows.length) {
					throw new Error('contributorが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		}
		return formattedData;
	};

	const worksheetName = '寄与者';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = await getArticleContributorRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleContributorColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleContributorColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleContributorColumn;
	worksheet.addRows(filteredData);
};

const saveArticlePublicationPublicationIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	data: CiNiiResearchResponse['publication']['publicationIdentifier']
) => {
	const articlePublicationPublicationIdentifierColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' || column.key.startsWith('publication-publicationIdentifier')
			);
		});
		return result;
	})();

	const getArticlePublicationPublicationIdentifierRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['publication']['publicationIdentifier']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'publication-publicationIdentifier-@type': item['@type'],
				'publication-publicationIdentifier-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error(
					'publication-publicationIdentifierが存在しないのにrowsが存在します'
				);
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '掲載誌-識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticlePublicationPublicationIdentifierRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!articlePublicationPublicationIdentifierColumn.some((column) => column.key === key)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articlePublicationPublicationIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articlePublicationPublicationIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticlePublicationPrismPublicationNameTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	data: CiNiiResearchResponse['publication']['prism:publicationName']
) => {
	const articlePublicationPrismPublicationNameColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'publication-prism:publicationName-@language' ||
				column.key === 'publication-prism:publicationName-@value'
			);
		});
		return result;
	})();

	const getArticlePublicationPrismPublicationNameRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['publication']['prism:publicationName']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'publication-prism:publicationName-@language': item['@language'],
				'publication-prism:publicationName-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error(
					'publication-prism:publicationNameが存在しないのにrowsが存在します'
				);
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '掲載誌-名称';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticlePublicationPrismPublicationNameRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!articlePublicationPrismPublicationNameColumn.some((column) => column.key === key)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articlePublicationPrismPublicationNameColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articlePublicationPrismPublicationNameColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticlePublicationDcPublisherTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	data: CiNiiResearchResponse['publication']['dc:publisher']
) => {
	const articlePublicationDcPublisherColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'publication-dc:publisher-@language' ||
				column.key === 'publication-dc:publisher-@value'
			);
		});
		return result;
	})();

	const getArticlePublicationDcPublisherRows = (
		id: CiNiiResearchResponse['@id'],
		data: CiNiiResearchResponse['publication']['dc:publisher']
	) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			const row = {
				'@id': id,
				'publication-dc:publisher-@language': item['@language'],
				'publication-dc:publisher-@value': item['@value'],
			};
			rows.push(row);
			formattedData = [...formattedData, ...rows];
		});
		if (!data) {
			if (formattedData.length) {
				throw new Error('publication-dc:publisherが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id });
		}
		return formattedData;
	};

	const worksheetName = '掲載誌-出版社';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticlePublicationDcPublisherRows(id, data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articlePublicationDcPublisherColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articlePublicationDcPublisherColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articlePublicationDcPublisherColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticlePublicationRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpPublicationIdentifier = [];
	const tmpPrismPublicationName = [];
	const tmpDcPublisher = [];

	for await (const item of data) {
		if (item.publication) {
			tmpPublicationIdentifier.push({
				id: item['@id'],
				data: item.publication['publicationIdentifier'] ?? [],
			});
			tmpPrismPublicationName.push({
				id: item['@id'],
				data: item.publication['prism:publicationName'] ?? [],
			});
			tmpDcPublisher.push({
				id: item['@id'],
				data: item.publication['dc:publisher'] ?? [],
			});
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpPublicationIdentifier) {
		await saveArticlePublicationPublicationIdentifierTable(
			workbook,
			filePath,
			item.id,
			item.data
		);
	}

	for await (const item of tmpPrismPublicationName) {
		await saveArticlePublicationPrismPublicationNameTable(
			workbook,
			filePath,
			item.id,
			item.data
		);
	}

	for await (const item of tmpDcPublisher) {
		await saveArticlePublicationDcPublisherTable(workbook, filePath, item.id, item.data);
	}
};

const saveArticlePublicationTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articlePublicationColumn = (() => {
		const targetColumnName = [
			'publication-prism:publicationDate',
			'publication-prism:volume',
			'publication-prism:number',
			'publication-prism:startingPage',
			'publication-prism:endingPage',
			'publication-jpcoar:numPages',
			'publication-foreign',
			'publication-jointInternationalResearch',
		];
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || targetColumnName.includes(column.key);
		});
		return result;
	})();

	const getArticlePublicationRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const row = {
				'@id': item['@id'],
				'publication-prism:publicationDate': item.publication?.['prism:publicationDate'],
				'publication-prism:volume': item.publication?.['prism:volume'],
				'publication-prism:number': item.publication?.['prism:number'],
				'publication-prism:startingPage': item.publication?.['prism:startingPage'],
				'publication-prism:endingPage': item.publication?.['prism:endingPage'],
				'publication-jpcoar:numPages': item.publication?.['jpcoar:numPages'],
				'publication-foreign': item.publication?.foreign,
				'publication-jointInternationalResearch':
					item.publication?.jointInternationalResearch,
			};
			formattedData.push(row);
		});
		return formattedData;
	};

	const worksheetName = '掲載誌';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticlePublicationRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articlePublicationColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articlePublicationColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articlePublicationColumn;
	worksheet.addRows(filteredData);

	// await workbook.xlsx.writeFile(filePath);
};

const saveArticleDcRightsTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleDcRightsColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('dc:rights');
		});
		return result;
	})();

	const getArticleDcRightsRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item['dc:rights']?.forEach((dcRights) => {
				const row = {
					'@id': item['@id'],
					'dc:rights-elm': dcRights,
				};
				rows.push(row);
			});
			if (!item['dc:rights']) {
				if (rows.length) {
					throw new Error('dc:rightsが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = '権利';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleDcRightsRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleDcRightsColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleDcRightsColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleDcRightsColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleUrlNodeTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	urlId: CiNiiResearchResponse['url'][0]['@id'],
	notation: CiNiiResearchResponse['url'][0]['notation']
) => {
	const articleUrlNodeColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'url-@id' ||
				column.key.startsWith('url-notation')
			);
		});
		return result;
	})();

	const getArticleUrlNodeRows = (
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

	const filteredData = getArticleUrlNodeRows(id, notation);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleUrlNodeColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleUrlNodeColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleUrlNodeColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleUrlRelationTables = async (
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
		await saveArticleUrlNodeTable(workbook, filePath, item.id, item.urlId, item.notation);
	}
};

const saveArticleUrlTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleUrlColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key === 'url-@id';
		});
		return result;
	})();

	const getArticleUrlRows = (data: CiNiiResearchResponse[]) => {
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

	const filteredData = getArticleUrlRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleUrlColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleUrlColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleUrlColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleFoafTopicTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleFoafTopicColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('foaf:topic');
		});
		return result;
	})();

	const getArticleFoafTopicRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item['foaf:topic']?.forEach((foafTopic) => {
				const row = {
					'@id': item['@id'],
					'foaf:topic-@id': foafTopic['@id'],
					'foaf:topic-dc:title': foafTopic['dc:title'],
				};
				rows.push(row);
			});
			if (!item['foaf:topic']) {
				if (rows.length) {
					throw new Error('foaf:topicが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = 'トピック';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleFoafTopicRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleFoafTopicColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleFoafTopicColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleFoafTopicColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleProjectProjectIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	projectId: CiNiiResearchResponse['project'][0]['@id'],
	projectIdentifier: CiNiiResearchResponse['project'][0]['projectIdentifier']
) => {
	const articleProjectProjectIdentifierColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'project-@id' ||
				column.key.startsWith('project-projectIdentifier')
			);
		});
		return result;
	})();

	const getArticleProjectProjectIdentifierRows = (
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

	const filteredData = getArticleProjectProjectIdentifierRows(id, projectIdentifier);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleProjectProjectIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleProjectProjectIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleProjectProjectIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleProjectNotationTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	projectId: CiNiiResearchResponse['project'][0]['@id'],
	notation: CiNiiResearchResponse['project'][0]['notation']
) => {
	const articleProjectNotationColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'project-@id' ||
				column.key.startsWith('project-notation')
			);
		});
		return result;
	})();

	const getArticleProjectNotationRows = (
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

	const filteredData = getArticleProjectNotationRows(id, notation);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleProjectNotationColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleProjectNotationColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleProjectNotationColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleProjectRelationTables = async (
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
		await saveArticleProjectProjectIdentifierTable(
			workbook,
			filePath,
			item.id,
			item.projectId,
			item.projectIdentifier
		);
	}

	for await (const item of tmpNotation) {
		await saveArticleProjectNotationTable(
			workbook,
			filePath,
			item.id,
			item.projectId,
			item.notation
		);
	}
};

const saveArticleProjectTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleProjectColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key === 'project-@id';
		});
		return result;
	})();

	const getArticleProjectRows = (data: CiNiiResearchResponse[]) => {
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

	const filteredData = getArticleProjectRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleProjectColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleProjectColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleProjectColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleRelatedProductProductIdentifier = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	productId: CiNiiResearchResponse['relatedProduct'][0]['@id'],
	productIdentifier: CiNiiResearchResponse['relatedProduct'][0]['productIdentifier']
) => {
	const articleRelatedProductProductIdentifierColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'relatedProduct-@id' ||
				column.key.startsWith('relatedProduct-productIdentifier')
			);
		});
		return result;
	})();

	const getArticleRelatedProductProductIdentifierRows = (
		id: CiNiiResearchResponse['@id'],
		productIdentifier: CiNiiResearchResponse['relatedProduct'][0]['productIdentifier']
	) => {
		let formattedData = [];
		productIdentifier?.forEach((item) => {
			const row = {
				'@id': id,
				'relatedProduct-@id': productId,
				'relatedProduct-productIdentifier-@type': item['@type'],
				'relatedProduct-productIdentifier-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!productIdentifier) {
			if (formattedData.length) {
				throw new Error('productIdentifierが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'relatedProduct-@id': productId });
		}
		return formattedData;
	};

	const worksheetName = '関連成果物-識別子';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleRelatedProductProductIdentifierRows(id, productIdentifier);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!articleRelatedProductProductIdentifierColumn.some((column) => column.key === key)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleRelatedProductProductIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleRelatedProductProductIdentifierColumn;
};

const saveArticleRelatedProductRelationTypeTable = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	productId: CiNiiResearchResponse['relatedProduct'][0]['@id'],
	relationType: CiNiiResearchResponse['relatedProduct'][0]['relationType']
) => {
	const articleRelatedProductRelationTypeColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'relatedProduct-@id' ||
				column.key.startsWith('relatedProduct-relationType')
			);
		});
		return result;
	})();

	const getArticleRelatedProductRelationTypeRows = (
		id: CiNiiResearchResponse['@id'],
		relationType: CiNiiResearchResponse['relatedProduct'][0]['relationType']
	) => {
		let formattedData = [];
		relationType?.forEach((relationT) => {
			const row = {
				'@id': id,
				'relatedProduct-@id': productId,
				'relatedProduct-relationType': relationT,
			};
			formattedData.push(row);
		});
		if (!relationType) {
			if (formattedData.length) {
				throw new Error('relationTypeが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'relatedProduct-@id': productId });
		}
		return formattedData;
	};

	const worksheetName = '関連成果物-関連タイプ';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleRelatedProductRelationTypeRows(id, relationType);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleRelatedProductRelationTypeColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleRelatedProductRelationTypeColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleRelatedProductRelationTypeColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleRelatedProductJpcoarRelatedTitle = async (
	workbook: Workbook,
	filePath: string,
	id: CiNiiResearchResponse['@id'],
	productId: CiNiiResearchResponse['relatedProduct'][0]['@id'],
	jpcoarRelatedTitle: CiNiiResearchResponse['relatedProduct'][0]['jpcoar:relatedTitle']
) => {
	const articleRelatedProductJpcoarRelatedTitleColumn = (() => {
		const result = articleColumns.filter((column) => {
			return (
				column.key === '@id' ||
				column.key === 'relatedProduct-@id' ||
				column.key.startsWith('relatedProduct-jpcoar:relatedTitle')
			);
		});
		return result;
	})();

	const getArticleRelatedProductJpcoarRelatedTitleRows = (
		id: CiNiiResearchResponse['@id'],
		jpcoarRelatedTitle: CiNiiResearchResponse['relatedProduct'][0]['jpcoar:relatedTitle']
	) => {
		let formattedData = [];
		jpcoarRelatedTitle?.forEach((item) => {
			const row = {
				'@id': id,
				'relatedProduct-@id': productId,
				'relatedProduct-jpcoar:relatedTitle-@language': item['@language'],
				'relatedProduct-jpcoar:relatedTitle-@value': item['@value'],
			};
			formattedData.push(row);
		});
		if (!jpcoarRelatedTitle) {
			if (formattedData.length) {
				throw new Error('jpcoarRelatedTitleが存在しないのにrowsが存在します');
			}
			formattedData.push({ '@id': id, 'relatedProduct-@id': productId });
		}
		return formattedData;
	};

	const worksheetName = '関連成果物-JPCOAR関連タイトル';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleRelatedProductJpcoarRelatedTitleRows(id, jpcoarRelatedTitle);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (
				!articleRelatedProductJpcoarRelatedTitleColumn.some((column) => column.key === key)
			) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleRelatedProductJpcoarRelatedTitleColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleRelatedProductJpcoarRelatedTitleColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleRelatedProductRelationTables = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const tmpProductIdentifier = [];
	const tmpRelationType = [];
	const tmpJpcoarRelatedTitle = [];

	for await (const item of data) {
		if (item.relatedProduct) {
			tmpProductIdentifier.push({
				id: item['@id'],
				productId: item.relatedProduct[0]['@id'],
				productIdentifier: item.relatedProduct[0]['productIdentifier'] ?? [],
			});
			tmpRelationType.push({
				id: item['@id'],
				productId: item.relatedProduct[0]['@id'],
				relationType: item.relatedProduct[0]['relationType'] ?? [],
			});
			tmpJpcoarRelatedTitle.push({
				id: item['@id'],
				productId: item.relatedProduct[0]['@id'],
				jpcoarRelatedTitle: item.relatedProduct[0]['jpcoar:relatedTitle'] ?? [],
			});
		}
	}

	// 一度に処理するプロミスの数を制限するロジックをここに実装

	for await (const item of tmpProductIdentifier) {
		await saveArticleRelatedProductProductIdentifier(
			workbook,
			filePath,
			item.id,
			item.productId,
			item.productIdentifier
		);
	}

	for await (const item of tmpRelationType) {
		await saveArticleRelatedProductRelationTypeTable(
			workbook,
			filePath,
			item.id,
			item.productId,
			item.relationType
		);
	}

	for await (const item of tmpJpcoarRelatedTitle) {
		await saveArticleRelatedProductJpcoarRelatedTitle(
			workbook,
			filePath,
			item.id,
			item.productId,
			item.jpcoarRelatedTitle
		);
	}
};

const saveArticleRelatedProductTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleRelatedProductColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key === 'relatedProduct-@id';
		});
		return result;
	})();

	const getArticleRelatedProductRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];
		data.forEach((item) => {
			const rows = [];
			item.relatedProduct?.forEach((relatedProduct) => {
				const row = {
					'@id': item['@id'],
					'relatedProduct-@id': relatedProduct['@id'],
				};
				rows.push(row);
			});
			if (!item.relatedProduct) {
				if (rows.length) {
					throw new Error('relatedProductが存在しないのにrowsが存在します');
				}
				rows.push({ '@id': item['@id'] });
			}
			formattedData = [...formattedData, ...rows];
		});
		return formattedData;
	};

	const worksheetName = '関連成果物';
	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getArticleRelatedProductRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleRelatedProductColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(`articleRelatedProductColumnに存在しないキーがあります: ${errorColumns}`);
	}

	worksheet.columns = articleRelatedProductColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveArticleDataSourceIdentifierTable = async (
	workbook: Workbook,
	filePath: string,
	data: CiNiiResearchResponse[]
) => {
	const articleDataSourceIdentifierColumn = (() => {
		const result = articleColumns.filter((column) => {
			return column.key === '@id' || column.key.startsWith('dataSourceIdentifier');
		});
		return result;
	})();

	const getArticleDataSourceIdentifierRows = (data: CiNiiResearchResponse[]) => {
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

	const filteredData = getArticleDataSourceIdentifierRows(data);

	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
	let errorColumns: string[] = [];
	filteredData.forEach((item) => {
		Object.keys(item).map((key) => {
			if (!articleDataSourceIdentifierColumn.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
	});
	if (errorColumns.length) {
		throw new Error(
			`articleDataSourceIdentifierColumnに存在しないキーがあります: ${errorColumns}`
		);
	}

	worksheet.columns = articleDataSourceIdentifierColumn;
	worksheet.addRows(filteredData);

	// await workbook;
};

const saveAllDataSameSheetXls = async (workbook: Workbook, data: CiNiiResearchResponse[]) => {
	const authorMainColumns = articleColumns2;

	const getAuthorMainRows = (data: CiNiiResearchResponse[]) => {
		let formattedData = [];

		/** 全てのバリューをJSON.stringifyしてformattedDataにpush */
		for (const item of data) {
			const row = {};
			Object.keys(item).forEach((key) => {
				row[key] = JSON.stringify(item[key]);
			});
			formattedData.push(row);

			// もしもcheckAuthorColumnsのkeyに存在しないキーがあればエラーにする
			const errorColumns: string[] = [];
			Object.keys(item).map((key) => {
				if (!articleColumns2.some((column) => column.key === key)) {
					errorColumns.push(key);
				}
			});
			if (errorColumns.length) {
				throw new Error(`checkAuthorColumnsに存在しないキーがあります: ${errorColumns}`);
			}
		}

		return formattedData;
	};

	const worksheetName = 'Main';

	let worksheet;

	worksheet = existsWorksheet(workbook, worksheetName)
		? workbook.getWorksheet(worksheetName)
		: workbook.addWorksheet(worksheetName);

	const filteredData = getAuthorMainRows(data);

	worksheet.columns = authorMainColumns;
	worksheet.addRows(filteredData);
};

const articleDataToExcel = async (filePath: string, data: CiNiiResearchResponse[]) => {
	const workbook = new Workbook();
	if (existsSync(filePath)) {
		await workbook.xlsx.readFile(filePath);
	}
	// await saveArticleMainTable(workbook, filePath, data);
	// await saveArticleProductIdentifierTable(workbook, filePath, data);
	// await saveArticleTitleTable(workbook, filePath, data);
	// await saveArticleDescriptionTable(workbook, filePath, data);
	// await saveArticleCreatorTable(workbook, filePath, data);
	// await saveCreatorRelationTables(workbook, filePath, data);
	// await saveArticleContributorTable(workbook, filePath, data);
	// await saveArticleContributorRelationTables(workbook, filePath, data);
	// await saveArticlePublicationTable(workbook, filePath, data);
	// await saveArticlePublicationRelationTables(workbook, filePath, data);
	// await saveArticleDcRightsTable(workbook, filePath, data);
	// await saveArticleUrlTable(workbook, filePath, data);
	// await saveArticleUrlRelationTables(workbook, filePath, data);
	// await saveArticleFoafTopicTable(workbook, filePath, data);
	// // await saveArticleFoafTopicRelationTables(workbook, filePath, data);
	// await saveArticleProjectTable(workbook, filePath, data);
	// await saveArticleProjectRelationTables(workbook, filePath, data);
	// await saveArticleRelatedProductTable(workbook, filePath, data);
	// await saveArticleRelatedProductRelationTables(workbook, filePath, data);
	// await saveArticleDataSourceIdentifierTable(workbook, filePath, data);
	await saveAllDataSameSheetXls(workbook, data);
	await workbook.xlsx.writeFile(filePath);
};

const resetAppendFile = async (filePath: string) => {
	if (existsSync(filePath)) {
		await unlink(filePath);
	}
};

const convertArticleNDJSONToExcel = async (year: number) => {
	const filePath = `${dirPrefix}/json_to_xlsx_is_medical_journal/${year}_article_onesheet.xlsx`;
	await resetAppendFile(filePath);

	const pipeline: Chain = chain([
		createReadStream(`${dirPrefix}/7_aggregate_results/${year}_articles.jsonl`),
		withParser(),
	]);

	let items: CiNiiResearchResponse[] = [];
	const chekcArticleColumns = [...articleColumns, ...articleColumns2];
	for await (const item of pipeline) {
		items.push(item.value);

		// item.valueのプロパティとarticleColumnsのkeyが一致しeない場合はconsoleに出力しておく
		const errorColumns: string[] = [];
		Object.keys(item.value).map((key) => {
			if (!chekcArticleColumns.some((column) => column.key === key)) {
				errorColumns.push(key);
			}
		});
		if (errorColumns.length) {
			console.log(`chekcArticleColumnsに存在しないキーがあります: ${errorColumns}`);
		}

		if (items.length >= 10) {
			await articleDataToExcel(filePath, items);
			items = [];
			await setTimeout(2000);
			console.log(`${item.key}件処理しました`)
		}

		await setTimeout(100);
	}

	if (items.length) {
		await articleDataToExcel(filePath, items);
		await setTimeout(100);
	}
};

(async () => {
	for await (const year of [2023]) {
		await convertArticleNDJSONToExcel(year);
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
// const saveArticleFoafTopicDcTitleTable = async (
// 	workbook: Workbook,
// 	filePath: string,
// 	id: CiNiiResearchResponse['@id'],
// 	foafTopicId: CiNiiResearchResponse['foaf:topic'][0]['@id'],
// 	dcTitle: CiNiiResearchResponse['foaf:topic'][0]['dc:title']
// ) => {
// 	const articleFoafTopicDcTitleColumn = (() => {
// 		const result = articleColumns.filter((column) => {
// 			return (
// 				column.key === '@id' ||
// 				column.key === 'foaf:topic-@id' ||
// 				column.key.startsWith('foaf:topic-dc:title')
// 			);
// 		});
// 		return result;
// 	})();

// 	const getArticleFoafTopicDcTitleRows = (
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

// 	const filteredData = getArticleFoafTopicDcTitleRows(id, dcTitle);

// 	// もしarticleMainColumnに存在しないfilteredDataのキーがあればコンソールに出力する
// 	let errorColumns: string[] = [];
// 	filteredData.forEach((item) => {
// 		Object.keys(item).map((key) => {
// 			if (!articleFoafTopicDcTitleColumn.some((column) => column.key === key)) {
// 				errorColumns.push(key);
// 			}
// 		});
// 	});
// 	if (errorColumns.length) {
// 		throw new Error(
// 			`articleFoafTopicDcTitleColumnに存在しないキーがあります: ${errorColumns}`
// 		);
// 	}

// 	worksheet.columns = articleFoafTopicDcTitleColumn;
// 	worksheet.addRows(filteredData);

// 	// await workbook;
// }

// const saveArticleFoafTopicRelationTables = async (
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
// 		await saveArticleFoafTopicDcTitleTable(
// 			workbook,
// 			filePath,
// 			item.id,
// 			item.foafTopicId,
// 			item.dcTitle
// 		);
// 	}
// }
