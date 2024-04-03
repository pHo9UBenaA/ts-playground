// cp cinii/.env.example cinii/.env
// docker compose exec node ./cinii/node_modules/.bin/ts-node ./cinii/script.ts > ./cinii/output.txt

import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { appendFile, writeFile } from 'fs/promises';
import * as gaxios from 'gaxios';
import { createInterface } from 'readline';
import { setTimeout } from 'timers/promises';
import { CiNiiResearchResponse } from './interfaces/cinii_research_response';
import {
	CountType,
	OpenSearchRequestQuery,
	SearchType,
	SortType,
} from './interfaces/opensearch_request';
import { OpenSearchResponse } from './interfaces/opensearch_response';
import { DeepPartial, TOrTArray } from './types/utils';

const dirPrefix = 'cinii';

// https://cir.nii.ac.jp/openurl/query の「rft.issn」パラメータを指定し、結果をconsoleで出力する
const searchTypes = {
	// all: 'すべて検索',
	// data: '研究データ',
	articles: '論文',
	// books: '本',
	// dissertations: '博士論文',
	// projects: 'プロジェクト',
} as const; //satisfies { [key in SearchType]: string };

const ignoreKeys = [
	// '@id',
	// '@value',
	// 'since',
	// 'until',
	// 'createdAt',
	// 'dc:date',
	// 'dc:creator',
	// 'ndl:dissertationNumber',
	// 'ndl:dateGranted',
	// 'prism:publicationDate',
	// 'prism:volume',
	// 'prism:number',
	// 'prism:startingPage',
	// 'prism:endingPage',
	// 'jpcoar:numPages',
] satisfies string[];

const queryList = [
	// 'エクソン20',
	// '非小細胞肺がん',
	// 'てんかん',
	// 'ヒト免疫不全ウイルス',
	// '癌',
	// '頭痛',
	// 'ファンコニ症候群',
	// '慢性リンパ性白血病',
	'cancer',
] satisfies string[];

const dataSourceList = [
	// 'CROSSREF',
	// 'CIA',
	// 'KAKEN',
	'JALC',
	// 'NDL',
	// 'NDL_DC',
	// 'IRDB',
	// 'INTEGBIO',
	// 'PUBMED',
	// 'NIKKEI_BP',
	// 'MDR',
];

const sortList = [0, 1, 4, 10] satisfies SortType[];

const yearList = [
	//2024, 2023, 2022,
	// 2021,
	// 2020, 2019,
	2018, 2017, 2016, 2015, 2014,
] satisfies number[];

const openSearchRequest = async (
	searchType: SearchType,
	params: OpenSearchRequestQuery
): Promise<OpenSearchResponse> => {
	const response = await gaxios.request<OpenSearchResponse>({
		url: `https://cir.nii.ac.jp/opensearch/${searchType}`,
		params,
	});
	// 無駄があるが管理が面倒なので一旦ここで遅延
	await setTimeout(2000);
	return response.data;
};

// 取り急ぎ、offset+countが10001以下か（CiNiiのOpenSearchAPIだとstartが10001件以上のデータは取得できないため）
const isOffsetAndCountLimit = (offset: number, count: CountType): boolean => {
	return offset + count <= 10000;
};

// 取り急ぎ、1900~現在の年の範囲であるか
const isFromAndUntilRange = (fromFullYear: number, untilFullYear: number): boolean => {
	const lowerYear = 1900;
	const currentYear = new Date().getFullYear();
	const isFromRange = fromFullYear >= lowerYear && fromFullYear <= currentYear;
	const isUntilRange = untilFullYear >= lowerYear && untilFullYear <= currentYear;
	return isFromRange && isUntilRange;
};

// 取り急ぎ、1~5000の範囲であるか
const isBatchSizeLimitRange = (batchSizeLimit: number): boolean => {
	return batchSizeLimit >= 1 && batchSizeLimit <= 10000;
};

/**
 *
 * @param searchType 検索データ種別
 * @param params
 * @param count 取得件数（OpenSearchRequestQuery.count）
 * @param offset 取得開始位置（1度目のリクエストのOpenSearchRequestQuery.start）
 * @param batchSizeLimit 一度に取得する件数の上限
 * @returns
 *
 * TODO: readonly args
 */
const fetchOpenSearchResponse = async (
	searchType: SearchType,
	params: Readonly<OpenSearchRequestQuery>,
	offset: number,
	from: Date,
	until: Date,
	count: CountType = 200,
	batchSizeLimit: number = 10000
): Promise<{ responses: OpenSearchResponse[]; nextOffset: number | null }> => {
	let responses: OpenSearchResponse[] = [];
	let nextOffset: number | null = null;

	const fromFullYear = from.getFullYear();
	const untilFullYear = until.getFullYear();

	if (!isOffsetAndCountLimit(offset, count)) {
		throw new Error('offset+countは10000以下である必要があります');
	}

	if (!isFromAndUntilRange(fromFullYear, untilFullYear)) {
		throw new Error('fromとuntilは1900~現在の年の範囲である必要があります');
	}

	if (!isBatchSizeLimitRange(batchSizeLimit)) {
		throw new Error('batchSizeLimitは1~10000の範囲である必要があります');
	}

	// const firstResponse = await openSearchRequest(searchType, params);
	// const totalResults = firstResponse['opensearch:totalResults'];
	// const itemsPerPage = firstResponse['opensearch:itemsPerPage'];

	// responses.push(firstResponse);

	// const iterateCount = Math.floor(totalResults / itemsPerPage);
	// for (let i = 1; i <= iterateCount; i++) {
	// 	const res = await openSearchRequest(searchType, { ...params, start: i * itemsPerPage + 1 });
	// 	await setTimeout(1000);
	// 	responses.push(res);
	// }
	// return responses;

	// const firstOffsetResponse = await openSearchRequest(searchType, {
	// 	...params,
	// 	start: offset + 1,
	// });
	const iterateCount = Math.floor(batchSizeLimit / count);

	// responses.push(firstOffsetResponse);

	for (let i = 0; i < iterateCount; i++) {
		// Note: response['opensearch:startIndex']と同様の値と想定
		const start = offset + i * count;

		// Note: currentParams.countはresponse['opensearch:itemsPerPage']と同様の値と想定
		const response = await openSearchRequest(searchType, {
			...params,
			count,
			start,
			from: `${fromFullYear}`,
			until: `${untilFullYear}`,
		});
		responses.push(response);

		// console.log(response);

		nextOffset = start + count;

		// 次の繰り返しで上限を超える場合は終了
		const totalCount = responses.reduce((acc, res) => acc + res.items.length, 0);
		if (totalCount + count > batchSizeLimit) {
			console.log('上限を超えるため終了', fromFullYear, totalCount, count, batchSizeLimit);
			break;
		}

		// 次のページがない場合は終了
		if (nextOffset >= response['opensearch:totalResults']) {
			console.log(
				'次のページがないため終了',
				fromFullYear,
				nextOffset,
				response['opensearch:totalResults']
			);
			nextOffset = null;
			break;
		}
	}

	return { responses, nextOffset };
};

// const opensearchRequest = async (
// 	searchType: SearchType,
// 	params: OpenSearchRequestQuery
// ): Promise<OpenSearchResponse[]> => {

// 	// const res = await axios.get(url, { params });
// 	// const res2 = await axios.get(url, { params: { ...params, start: params.count + 1 } });

// 	const firstResponse = await axios.get(url, { params });

// 	const responseArray = await Promise.all(for (let i = 1; i <= iterateCount; i++) {
// 		return 'test'
// 	});
// 	console.log(JSON.stringify(res.data, null, 2));
// 	console.log(JSON.stringify(res2.data, null, 2));
// 	// const res3 = await axios.get(url, { params: { ...params, start: params.count * 2 + 1 } });
// 	// return [res.data, res2.data, res3.data];
// 	return [res.data, res2.data];
// };

const ciniiResearchRequest = async (url: string): Promise<CiNiiResearchResponse> => {
	// const url = `https://cir.nii.ac.jp/crid/1050001337660654208.json`;
	const res = await gaxios.request<CiNiiResearchResponse>({ url });
	return res.data;
};

type ShallowCiNiiResearchResponseCount = {
	[K in keyof CiNiiResearchResponse]: CiNiiResearchResponse[K] extends object
		? // Objectは別の機構でカウントする
		  undefined
		: number;
};

// WIP
type FormattedDeepCiNiiResearchResponsePropertyLiteral =
	| string
	| {
			[key: string]:
				| TOrTArray<string>
				| TOrTArray<{
						[key: string]:
							| TOrTArray<string>
							| TOrTArray<{
									[key: string]: string;
							  }>;
				  }>;
	  };
type FormattedDeepCiNiiResearchResponseProperty<Level extends 1 | 2> = Level extends 1
	? FormattedDeepCiNiiResearchResponsePropertyLiteral[]
	: TOrTArray<FormattedDeepCiNiiResearchResponsePropertyLiteral>;

type FormattedDeepCiNiiResearchResponse = {
	[key: string]: FormattedDeepCiNiiResearchResponseProperty<1>;
};

// WIP
type DeepCountPropertyLiteral =
	| {
			value: string;
			count: number;
	  }
	| {
			[key: string]:
				| TOrTArray<{
						value: string;
						count: number;
				  }>
				| TOrTArray<{
						[key: string]:
							| TOrTArray<{
									value: string;
									count: number;
							  }>
							| TOrTArray<{
									[key: string]: TOrTArray<{
										value: string;
										count: number;
									}>;
							  }>;
				  }>;
	  };
type DeepCountProperty<Level extends 1 | 2> = Level extends 1
	? DeepCountPropertyLiteral[] | { [key: string]: number }
	: TOrTArray<DeepCountPropertyLiteral>;

type DeepCiNiiResearchResponseCount = {
	[key: string]: DeepCountProperty<1>;
};

const countNestedProperty = (
	countObjectProperty: DeepPartial<DeepCountProperty<2>>,
	value: DeepPartial<FormattedDeepCiNiiResearchResponseProperty<2>>
): any => {
	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			if (
				countObjectProperty === undefined ||
				Object.keys(countObjectProperty).length === 0
			) {
				countObjectProperty = // createCountObjectProperty(value[0]);
					typeof value[0] === 'object' && !Array.isArray(value[0]) ? {} : [];
			}

			value.forEach((subValue) => {
				const res = countNestedProperty(countObjectProperty, subValue);
				countObjectProperty = res;
			});

			return countObjectProperty;
		} else {
			Object.entries(value).forEach(([subKey, subValue]) => {
				if (
					countObjectProperty[subKey] === undefined ||
					Object.keys(countObjectProperty[subKey]).length === 0
				) {
					countObjectProperty[subKey] =
						typeof subValue === 'object' && !Array.isArray(subValue) ? {} : [];
				}

				if (!ignoreKeys.includes(subKey)) {
					const res = countNestedProperty(countObjectProperty[subKey], subValue);
					countObjectProperty[subKey] = res;
				} else {
					const res = countNonNestedProperty(
						countObjectProperty[subKey],
						`${subKey}: 詳細にカウントする必要がないためkeyの出現のみカウント`
					);
					countObjectProperty[subKey] = res;
				}
			});
			return countObjectProperty;
		}
	} else if (typeof value === 'string') {
		return countNonNestedProperty(countObjectProperty as [], value);
	} else {
		console.log(`考慮漏れっぽい: ${value}`);
	}
};

const countNonNestedProperty = (
	countObjectProperty: { value: string; count: number }[],
	value: string
): { value: string; count: number }[] => {
	const exists = countObjectProperty.find((ob) => ob.value === value);
	if (exists) {
		exists.count++;
		return countObjectProperty;
	}
	return [...countObjectProperty, { value, count: 1 }];
};

const countProperties = (
	input: FormattedDeepCiNiiResearchResponse
): DeepCiNiiResearchResponseCount => {
	let result: DeepCiNiiResearchResponseCount = {};

	Object.entries(input).forEach(([mainKey, mainValue]) => {
		if (result[mainKey] === undefined) {
			result[mainKey] = [];
		}

		mainValue.forEach((elm) => {
			if (typeof elm === 'object') {
				if (result[mainKey] === undefined || Object.keys(result[mainKey]).length === 0) {
					result[mainKey] = typeof elm === 'object' && !Array.isArray(elm) ? {} : [];
				}

				if (Array.isArray(elm)) {
					console.log(`考慮漏れっぽい: ${elm}`);
				}
				const res = countNestedProperty(result[mainKey], elm);
				result[mainKey] = res;
			} else if (typeof elm === 'string') {
				if (!ignoreKeys.includes(mainKey)) {
					const res = countNonNestedProperty(
						result[mainKey] as { value: string; count: number }[],
						elm
					);
					result[mainKey] = res;
				} else {
					const res = countNonNestedProperty(
						result[mainKey] as { value: string; count: number }[],
						`${mainKey}: 詳細にカウントする必要がないためkeyの出現のみカウント`
					);
					result[mainKey] = res;
				}
			} else {
				console.log(`考慮漏れっぽい: ${elm}`);
			}
		});
	});

	return result;
};

const countAttributes = (
	responses: CiNiiResearchResponse[],
	countObj: ShallowCiNiiResearchResponseCount
): {
	shallowCount: DeepCiNiiResearchResponseCount;
	deepCount: DeepCiNiiResearchResponseCount;
} => {
	let formattedSallowResponse: FormattedDeepCiNiiResearchResponse = {};
	let formattedDeepResponse: FormattedDeepCiNiiResearchResponse = {};

	responses.forEach((response) => {
		Object.keys(response).forEach((key) => {
			if (typeof response[key] === 'object' && response[key] !== null) {
				if (formattedDeepResponse[key] === undefined) {
					formattedDeepResponse[key] = [];
				}
				if (Array.isArray(response[key])) {
					formattedDeepResponse[key].push(...response[key]);
				} else {
					formattedDeepResponse[key].push(response[key]);
				}
			} else if (typeof response[key] === 'string') {
				// if (key === 'publicationStatusCode' || key === 'publicationPeriodicityCode') {
				// 	console.log(`${key}が含まれれる: ${response['@id']}`);
				// }
				if (countObj.hasOwnProperty(key)) {
					if (formattedSallowResponse[key] === undefined) {
						formattedSallowResponse[key] = [];
					}
					formattedSallowResponse[key].push(response[key]);
				} else {
					console.log(`考慮漏れっぽい: ${key}`);
				}
			} else {
				console.log(`考慮漏れっぽい: ${key}`);
			}
		});
	});

	return {
		shallowCount: countProperties(formattedSallowResponse),
		deepCount: countProperties(formattedDeepResponse),
	};
};

const countCiniiResearchResponses = (
	responses: CiNiiResearchResponse[]
): {
	shallowCount: ShallowCiNiiResearchResponseCount;
	deepCount: DeepCiNiiResearchResponseCount;
} => {
	return countAttributes(responses, {
		// '@context': 0,
		'@id': 0,
		'@type': 0,
		resourceType: 0,
		since: 0,
		until: 0,
		reviewed: 0,
		'dc:language': 0,
		'dcterms:accessRights': 0,
		'ndl:dissertationNumber': 0,
		'ndl:dateGranted': 0,
		'ndl:degreeName': 0,
		'jpcoar:conferenceName': 0,
		'jpcoar:conferencePlace': 0,
		'jpcoar:conferenceSponsor': 0,
		invited: 0,
		'prism:edition': 0,
		printing: 0,
		'dc:date': 0,
		'dc:creator': 0,
		publicationCountryCode: 0,
		'cinii:size': 0,
		'dcterms:extent': 0,
		publicationStatusCode: 0,
		publicationPeriodicityCode: 0,
		publicationRegularityCode: 0,
		serialsTypeCode: 0,
		'datacite:version': 0,
		createdAt: 0,
		modifiedAt: 0,

		/**
		 * CiNii ResearchのJSON-LDのフォーマット仕様には記載がないが「プロジェクト」にて返り値が存在する
		 * @link https://support.nii.ac.jp/ja/cir/r_json#format
		 */
		projectStatus: 0,
		allocationAmount: 0,
	} as const satisfies ShallowCiNiiResearchResponseCount);
};

const writeCount = async (filename: string, count: object) => {
	await writeFile(`${dirPrefix}/${filename}`, JSON.stringify(count, null, 2));
};

const institutionObjectKeyMapper = {
	institutionIdentifier: '識別子',
	notation: '表記',
};

const departmentObjectKeyMapper = {
	departmentIdentifier: '識別子',
	notation: '表記',
};

const jobTitleObjectKeyMapper = {
	jobTitleIdentifier: '識別子',
	notation: '表記',
};

const keywordObjectKeyMapper = {
	textList: '表記',
};

const breakdownCostObjectKeyMapper = {
	notation: '表記',
};

const nest2KeyMapper = {
	institution: institutionObjectKeyMapper,
	department: departmentObjectKeyMapper,
	jobTitle: jobTitleObjectKeyMapper,
	keyword: keywordObjectKeyMapper,
	breakdownCost: breakdownCostObjectKeyMapper,
};

const foafPersonKeyMapper = {
	'foaf:name': '表記',
	'foaf:familyName': '姓',
	'foaf:givenName': '名',
	'foaf:middleName': 'ミドルネーム',
};

const careerKeyMapper = {
	institution: '所属機関',
	department: '部局',
	jobTitle: '職名',
	since: '着任日',
	until: '離任日',
};

const fieldKeyMapper = {
	keyword: 'キーワード',
};

const descriptionKeyMapper = {
	type: '概要種別',
	notation: '表記',
	abstractLicenseFlag: '抄録ライセンスフラグ',
};

const researcherKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': '種別',
	personIdentifier: 'CiNiiResearch外部の識別子',
	'foaf:name': '氏名',
	'jpcoar:affiliationName': '所属',
	role: '本研究における役割',
};

const institutionKeyMapper = {
	institutionIdentifier: 'CiNiiResearch外部の識別子',
	notation: '表記',
};

const fundingProgramKeyMapper = {
	'jpcoar:funderName': '表記',
};

const creatorKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	personIdentifier: 'CiNiiResearch外部の識別子',
	'foaf:name': '氏名',
	'jpcoar:affiliationName': '所属',
	role: '本研究における役割',
};

const contributorKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	personIdentifier: 'CiNiiResearch外部の識別子',
	'foaf:name': '氏名',
	'jpcoar:affiliationName': '所属',
	role: '本研究における役割',
};

const publicationKeyMapper = {
	publicationIdentifier: 'CiNiiResearch外部の識別子',
	'prism:publicationName': 'タイトル',
	'dc:publisher': '発行者',
	'prism:publicationDate': '発行日',
	'prism:volume': '巻',
	'prism:number': '号',
	'prism:startingPage': '開始ページ',
	'prism:endingPage': '終了ページ',
	'jpcoar:numPages': '総ページ数',
	foreign: '国際誌の有無',
	jointInternationalResearch: '国際共著の有無',
};

const degreeAwardInstitutionKeyMapper = {
	institutionIdentifier: '研究機関識別子',
	'jpcoar:degreeGrantorName': '表記',
};

// const jpcoarConferenceDateKeyMapper = {
// 	'jpcoar:startDay':
// 'jpcoar:startMonth'
// 'jpcoar:startYear'
// 'jpcoar:endDay'
// 'jpcoar:endMonth'
// 'jpcoar:endYear'
// }

const dctermsMediumKeyMapper = {
	generalMaterialDesignationCode: '一般',
	specificMaterialDesignationCode: '特殊',
};

const dctermsPublisherKeyMapper = {
	'dc:publisher': '出版社',
	publicationPlace: '出版地',
	'prism:publicationDate': '出版年月日',
};

const urlKeyMapper = {
	'@id': '外部サービスなどへのリンク',
	notation: '表記',
};

const dctermsSubjectKeyMapper = {
	subjectScheme: '種類コード',
	notation: '表記',
};

const projectKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	projectIdentifier: 'CiNiiResearch外部の識別子',
	role: '本研究における役割',
	notation: '課題表記',
	// 念の為
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const relatedProjectKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	projectIdentifier: 'CiNiiResearch外部の識別子',
	relationType: '本研究との関連',
	// 念の為
	notation: '課題表記',
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const productKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	resourceType: '成果物資源種別',
	productIdentifier: 'CiNiiResearch外部の識別子',
	relation: '成果物との関連種別',
	notation: '成果物表記',
	// 念の為
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const relatedProductKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	productIdentifier: 'CiNiiResearch外部の識別子',
	resourceType: '成果物資源種別',
	relationType: 'この成果物との関連性',
	// 念の為
	notation: '成果物表記',
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const grantKeyMapper = {
	grantIdentifier: 'CiNiiResearch外部の識別子',
	'jpcoar:fundingStream': '表記',
};

const allocationClassificationKeyMapper = {
	notation: '表記',
};

const allocationAmountKeyMapper = {
	totalCost: '合計金額',
	breakdownCost: '経費内訳',
};

const nestKeyMapper = {
	'foaf:Person': foafPersonKeyMapper,
	career: careerKeyMapper,
	field: fieldKeyMapper,
	description: descriptionKeyMapper,
	researcher: researcherKeyMapper,
	institution: institutionKeyMapper,
	fundingProgram: fundingProgramKeyMapper,
	creator: creatorKeyMapper,
	contributor: contributorKeyMapper,
	publication: publicationKeyMapper,
	degreeAwardInstitution: degreeAwardInstitutionKeyMapper,
	'dcterms:medium': dctermsMediumKeyMapper,
	'dcterms:publisher': dctermsPublisherKeyMapper,
	url: urlKeyMapper,
	'dcterms:subject': dctermsSubjectKeyMapper,
	project: projectKeyMapper,
	relatedProject: relatedProjectKeyMapper,
	product: productKeyMapper,
	relatedProduct: relatedProductKeyMapper,
	grant: grantKeyMapper,
	allocationClassification: allocationClassificationKeyMapper,
	allocationAmount: allocationAmountKeyMapper,
};

const keyMapper = {
	'@context': 'コンテキスト',
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	projectIdentifier: 'CiNiiResearch外部の識別子',
	personIdentifier: 'CiNiiResearch外部の識別子',
	productIdentifier: 'CiNiiResearch外部の識別子',
	resourceType: '資源種別',
	'dc:title': 'タイトル',
	'jpcoar:awardTitle': 'タイトル（プロジェクト）',
	'dcterms:alternative': 'その他のタイトル',
	'foaf:Person': '氏名',
	career: '所属',
	field: '審査区分/研究分野',
	'dc:language': '言語',
	description: '概要(抄録)',
	researcher: '研究者',
	since: '開始日',
	until: '終了日',
	institution: '研究機関',
	fundingProgram: '助成機関',
	creator: '著者',
	contributor: '寄与者',
	publication: '掲載誌',
	reviewed: '査読の有無',
	'dcterms:accessRights': 'オープンアクセスの有無',
	'ndl:dissertationNumber': '学位授与番号',
	'ndl:dateGranted': '学位授与年月日',
	'ndl:degreeName': '学位名',
	degreeAwardInstitution: '学位授与機関',
	'jpcoar:conferenceName': '学会または会議名',
	'jpcoar:conferencePlace': '開催地',
	'jpcoar:conferenceDate': '開催機関',
	'jpcoar:conferenceSponsor': '主催者',
	invited: '招待の有無',
	'prism:edition': '版',
	printing: '刷',
	'dc:date': '出版年月日',
	'dcterms:medium': '出版種別コード',
	'dc:creator': '責任表示',
	publicationCountryCode: '出版国コード',
	'dcterms:publisher': '出版情報',
	'dc:subject': '分類',
	'cinii:size': '大きさ、版型',
	'dcterms:extent': 'ページ数',
	publicationStatusCode: '出版状況コード',
	publicationPeriodicityCode: '刊行頻度コード',
	publicationRegularityCode: '定期性コード',
	serialsTypeCode: '逐次刊行物のタイプコード',
	'jpcoar:extent': 'サイズ',
	format: 'フォーマット',
	'datacite:version': 'バージョン',
	'dc:rights': '著作権',
	url: 'URL',
	createdAt: '公開日',
	modifiedAt: '最終更新日',
	'foaf:topic': 'キーワード',
	'dcterms:subject': '件名',
	'cinii:note': '注記',
	project: 'プロジェクト（研究課題）',
	relatedProject: '関連プロジェクト',
	product: '成果物',
	relatedProduct: '関連成果物',
	dataSourceIdentifier: 'データソース識別子',
	'dcterms:tableOfContents': '目次',
	grant: '助成プログラム',
	allocationClassification: '配分区分',
	allocationAmount: '配分額',
	projectStatus: 'プロジェクト状況',
};

const formatObject = (object: CiNiiResearchResponse) => {
	let result = {};
	Object.keys(object).forEach((key) => {
		const resultKey = keyMapper[key] || key;
		// const propName = prefix ? `${prefix}-${key}` : key;
		if (typeof object[key] === 'object' && object[key] !== null) {
			// if (Array.isArray(object[key])) {
			// 	result[propName] = object[key].map((v) => flattenObject(v)).flat();
			// 	continue;
			// }
			if (nestKeyMapper.hasOwnProperty(key)) {
				if (Array.isArray(object[key])) {
					const nestResultKey = nestKeyMapper[key];
					object[key].map((v, i) => {
						if (typeof v === 'object') {
							if (Array.isArray(v)) {
							}
						} else {
							const primitiveArrayResultKey = `${resultKey}-${nestKeyMapper}-${i}`;
							result[primitiveArrayResultKey] = v;
							return;
						}
						// const arrayResultKey = `${resultKey}-${i}`;
						// const arrayResultValue = Object.keys(v).reduce((acc, subKey) => {
						// 	if (nestKeyMapper[key].hasOwnProperty(subKey)) {
						// 		acc[nestKeyMapper[key][subKey]] = v[subKey];
						// 	} else {
						// 		console.log(`除外しました：${key}-${subKey}`);
						// 	}
						// 	return acc;
						// }, {});
						// if (i > 0 && !result[arrayResultKey]) {
						// 	result[arrayResultKey] = JSON.stringify(arrayResultValue);
						// 	return;
						// }
						// result[arrayResultKey] = JSON.stringify(arrayResultValue);
					});
				} else {
					const resultValue = Object.keys(object[key]).reduce((acc, subKey) => {
						if (nestKeyMapper[key].hasOwnProperty(subKey)) {
							acc[nestKeyMapper[key][subKey]] = object[key][subKey];
						} else {
							console.log(`除外しました：${key}-${subKey}`);
						}
						return acc;
					}, {});
					result[resultKey] = JSON.stringify(resultValue);
				}
			} else {
				if (Array.isArray(object[key])) {
					object[key].map((v, i) => {
						const arrayResultKey = `${resultKey}-${i}`;
						result[arrayResultKey] = JSON.stringify(v);
					});
				} else {
					result[resultKey] = JSON.stringify(object[key]);
				}
			}
		} else {
			result[resultKey] = object[key];
		}
	});

	return result;
};

const formatObject2 = (object: CiNiiResearchResponse) => {
	let result = {};
	let result2 = {};
	Object.entries(object).forEach(([key, value]) => {
		const firstLevelKey = keyMapper[key] || key;
		// const requireNextLevelKey = `_${firstLevelKey}_`;
		if (firstLevelKey === key) {
			throw new Error(`1_第一階層：keyMapperが網羅できていないです：${key}`);
		}

		if (typeof value === 'object') {
			// dc:titleなどを想定
			if (Array.isArray(value)) {
				// 一つの詳細データに対して複数のデータが紐づいている場合、別のテーブルで管理する。
				// そのため、UUIDを割り振る
				result[`${firstLevelKey}_UUID`] = randomUUID();
			} else {
				// 第二階層
				// const valueObjectInArrayTypeValue = Object.values(value).some(
				// 	(v) => typeof v === 'object' && Array.isArray(v)
				// );
				// if (valueObjectInArrayTypeValue) {
				// 	// 一つの詳細データに対して複数のデータが紐づいている場合、別のテーブルで管理する。
				// 	// そのため、UUIDを割り振る
				// 	result[requireNextLevelKey] = randomUUID();
				// } else {
				// 一つの詳細データに対して1つのオブジェクトデータが紐づいている場合（オブジェクトのValueに配列が含まれないことも上の処理で確認ずみ）
				Object.entries(value).forEach(([secondKey, secondValue]) => {
					if (nestKeyMapper.hasOwnProperty(key)) {
						const secondLevelKey =
							`${firstLevelKey}_${nestKeyMapper[key][secondKey]}` || secondKey;
						if (secondLevelKey === secondKey) {
							throw new Error(
								`1_第二階層：nestKeyMapperが網羅できていないです：${key}_${secondKey}`
							);
						}
						if (typeof secondValue === 'object') {
							if (Array.isArray(secondValue)) {
								result[`${secondLevelKey}_UUID`] = randomUUID();
							} else {
								result[`${secondLevelKey}_UUID`] = randomUUID();
							}
						} else {
							result[secondLevelKey] = secondValue;
						}
					} else {
						throw new Error(
							`2_第二階層：nestKeyMapperが網羅できていないです：${key}_${secondKey}`
						);
					}
				});
				// }
			}
		} else {
			// @idや@typeなどを想定
			result[firstLevelKey] = value;
		}
	});

	Object.entries(object).forEach(([key, value]) => {
		const firstLevelKey = keyMapper[key] || key;
		// const requireNextLevelKey = `_${firstLevelKey}_`;
		if (firstLevelKey === key) {
			throw new Error(`1_第一階層：keyMapperが網羅できていないです：${key}`);
		}

		if (typeof value === 'object') {
			// dc:titleなどを想定
			if (Array.isArray(value)) {
				// 一つの詳細データに対して複数のデータが紐づいている場合、別のテーブルで管理する。
				// そのため、UUIDを割り振る
				const result2_value = value.map((v) => {
					return {
						uuid: result[`${firstLevelKey}_UUID`],
						value: v,
					};
				});
				result2[firstLevelKey] = result2_value;
			} else {
				// 第二階層
				// const valueObjectInArrayTypeValue = Object.values(value).some(
				// 	(v) => typeof v === 'object' && Array.isArray(v)
				// );
				// if (valueObjectInArrayTypeValue) {
				// 	// 一つの詳細データに対して複数のデータが紐づいている場合、別のテーブルで管理する。
				// 	// そのため、UUIDを割り振る
				// 	result[requireNextLevelKey] = randomUUID();
				// } else {
				// 一つの詳細データに対して1つのオブジェクトデータが紐づいている場合（オブジェクトのValueに配列が含まれないことも上の処理で確認ずみ）
				Object.entries(value).forEach(([secondKey, secondValue]) => {
					if (nestKeyMapper.hasOwnProperty(key)) {
						const secondLevelKey =
							`${firstLevelKey}_${nestKeyMapper[key][secondKey]}` || secondKey;
						if (typeof secondValue === 'object') {
							if (Array.isArray(secondValue)) {
								if (nest2KeyMapper.hasOwnProperty(secondKey)) {
									const thirdLevelKey = `${secondLevelKey}_${nest2KeyMapper}`;
									Object.entries(secondValue).forEach(
										(thirdKey, thirdValue) => {}
									);
								} else {
									throw new Error(`想定外の値です：${key}_${secondKey}`);
								}
							} else {
							}
						} else {
							undefined;
						}
					} else {
						throw new Error(
							`2_第二階層：nestKeyMapperが網羅できていないです：${key}_${secondKey}`
						);
					}
				});
				// }
			}
		} else {
			// @idや@typeなどを想定
			undefined;
		}
	});

	return result;
};

const createWsHeader = (wsData: object[]) => {
	const header = new Set<string>();
	wsData.forEach((data) => {
		Object.keys(data).forEach((key) => {
			header.add(key);
		});
	});
	// keyMapperのValueの順番に並び替える（実際にValueに完全一致するわけではなく、Valueがプレフィックスに含まれる場合も含む）
	const keyMapperValues = Object.values(keyMapper);
	const sortHeader = Array.from(header).sort((a, b) => {
		const aIndex = keyMapperValues.findIndex((v) => a.indexOf(v) === 0);
		const bIndex = keyMapperValues.findIndex((v) => b.indexOf(v) === 0);

		if (aIndex === -1) {
			return 1;
		}
		if (bIndex === -1) {
			return -1;
		}
		return aIndex - bIndex;
	});

	return sortHeader;
};

const writeXlsx = (filename: string, data: CiNiiResearchResponse[]) => {
	const xlsx = require('xlsx');
	const wsData = data.map((d) => formatObject(d));
	// const ws = xlsx.utils.json_to_sheet(ws_data);
	const ws = xlsx.utils.json_to_sheet(wsData, { header: createWsHeader(wsData) });
	const wb = xlsx.utils.book_new();
	xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
	xlsx.writeFile(wb, `${dirPrefix}/${filename}.xlsx`);
};

const writeJson = async (filename: string, data: CiNiiResearchResponse[]) => {
	const formattedObject = data.map((d) => formatObject2(d));
	await writeFile(`${dirPrefix}/${filename}.json`, JSON.stringify(formattedObject, null, 2));
};

const writeData = (filename: string, data: CiNiiResearchResponse[]) => {
	writeXlsx(filename, data);
	writeJson(filename, data);
};

const writeIdData = async (data: string[]) => {};

// 数万件取得する際、一時的にidのみ保持するファイルを作成する
if (false) {
	(async () => {
		for await (const dataSource of dataSourceList) {
			for await (const sort of sortList) {
				const params: OpenSearchRequestQuery = {
					appid: process.env.CINII_APP_ID,
					format: 'json',
					q: 'cancer',
					sortorder: sort,
					dataSourceType: dataSource,
					// languageType: 'ja',
				} as const;

				// 取り急ぎ
				for await (const year of yearList) {
					let offset = 1;
					const fromAndUntilDate: Date = new Date(year, 0, 1);
					const { responses: openSearchResponses, nextOffset } =
						await fetchOpenSearchResponse(
							// searchType,
							'articles',
							params,
							offset,
							fromAndUntilDate,
							fromAndUntilDate
						);
					offset = nextOffset;
					await appendFile(
						`${dirPrefix}/${year}/${year}_${dataSource}_${sort}_id_not_uniq.txt`,
						openSearchResponses
							.map((res) => res.items)
							.flat()
							.map((item) => item['@id'])
							.join('\n')
					);
					await setTimeout(20000);
				}
			}
		}
	})();
}

const readIdData = async (filename: string) => {
	const fileStream = createReadStream(filename);

	const rl = createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});

	const lines: string[] = [];

	for await (const line of rl) {
		if (line.trim()) {
			lines.push(line);
		}
	}

	return lines;
};

const splitArrayIntoChunk = <T extends string>(array: T[], chunkSize: number): T[][] => {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
};

const resetAppendFile = async (filename: string) => {
	await writeFile(`${dirPrefix}/4_author_detail/${filename}`, '');
};

const appendCiniiResearchResponseData = async (filename: string, data: string) => {
	await appendFile(`${dirPrefix}/4_author_detail/${filename}`, data + ',\n');
};

const readIdDataAndFetchCiNiiAndSave = async (year: number) => {
	if (year === 2021 || year === 2022 || year === 2023 || year === 2024) {
		return;
	}

	// const fileStream = createReadStream(`${dirPrefix}/aaa.txt`);
	const fileStream = createReadStream(
		`${dirPrefix}/${year}_2_author_ids_in_target_article_details.txt`
	);

	const appendFilename = `${year}_uniq_target_author_details.jsonl`;
	const appendDoneIdFilename = `${year}_uniq_target_author_details_done_id.txt`;
	resetAppendFile(appendFilename);
	resetAppendFile(appendDoneIdFilename);

	const rl = createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});

	for await (const itemId of rl) {
		console.log(`${year}: ${itemId}`);
		if (itemId.trim()) {
			const response = await ciniiResearchRequest(`${itemId}.json`);
			await appendFile(
				`${dirPrefix}/4_author_detail/${appendFilename}`,
				JSON.stringify(response) + '\n'
			);
			await appendFile(`${dirPrefix}/4_author_detail/${appendDoneIdFilename}`, itemId + '\n');
			await setTimeout(1000);
		}
	}
};

// ↑のスクリプトから取得したidのみ保持するファイルを読み込んで、CiNii Research APIを叩いてデータを取得する
(async () => {
	if (false) {
		const batchSize = 100;
		for await (const year of yearList) {
			const targetIds = await readIdData(`${dirPrefix}/${year}_sorted_unique_output.txt`);

			const appendFilename = `${year}_cancer_articles.json`;
			resetAppendFile(appendFilename);

			for await (const itemIds of splitArrayIntoChunk<string>(targetIds, batchSize)) {
				for await (const itemId of itemIds) {
					const response = await ciniiResearchRequest(itemId);
					await appendCiniiResearchResponseData(
						appendFilename,
						JSON.stringify(response, null, 2)
					);
					await setTimeout(2000);
				}
				console.log(`${batchSize}件 done!`);
			}
			setTimeout(30000);
		}
	}
	for await (const year of yearList) {
		await readIdDataAndFetchCiNiiAndSave(year);
	}
})();

if (false) {
	(async () => {
		// for (const query of queryList) {
		// for (const searchType of Object.keys(searchTypes) as SearchType[]) {
		// if (searchType === 'all') return;

		// for await (const dataSource of dataSourceList) {
		// 	for await (const sort of sortList) {
		if (false) {
			const params: OpenSearchRequestQuery = {
				appid: process.env.CINII_APP_ID,
				format: 'json',
				// q: query,
				q: 'cancer',
				// sortorder: sort,
				// dataSourceType: dataSource,
				// sortorder: 10,
				// count: 200,
				// issn: '13468812',
				// languageType: 'ja',
				// from: '2013',
				// until: '2024',
			} as const;

			// 取り急ぎ
			for await (const year of yearList) {
				let offset = 1;
				const fromAndUntilDate: Date = new Date(year, 0, 1);
				const { responses: openSearchResponses, nextOffset } =
					await fetchOpenSearchResponse(
						// searchType,
						'articles',
						params,
						offset,
						fromAndUntilDate,
						fromAndUntilDate
					);
				offset = nextOffset;
				await appendFile(
					`${dirPrefix}/${year}/${year}_id_not_uniq.txt`,
					openSearchResponses
						.map((res) => res.items)
						.flat()
						.map((item) => item['@id'])
						.join('\n')
				);
				// await setTimeout(20000);
			}
		}

		// return;

		// const items = openSearchResponses.map((res) => res.items).flat();
		// const itemsId = items.map((item) => item['@id']);

		// const itemIds = openSearchResponses
		// 	.map((res) => res.items)
		// 	.flat()
		// 	.map((item) => item['@id']);

		const itemIds = await readIdData('2020/2020_CIA_0_id_not_uniq.txt');

		for await (const itemId of itemIds) {
			const response = await ciniiResearchRequest(itemId);
		}

		console.log(JSON.stringify(itemIds, null, 2));

		if (false) {
			const responses = (await Promise.all(itemIds.map((id) => ciniiResearchRequest(id))))
				.map((response) => {
					if (response['@type'] === 'Product') {
						throw '考慮もれ、Productはここには含まれない';
					}
					return response;
				})
				.filter((v) => v);

			// writeCount(`${searchType}_shallow_count_${query}.json`, responses);

			// writeData(`${searchType}_responses_${query}`, responses);
		}

		// const projectIdentifiers = responses
		// 	.map((response) => {
		// 		return {...response.projectIdentifier, 'origin_id': response['@id']};
		// 	})
		// 	.filter((v) => v);
		// const personIdentifiers = responses
		// 	.map((response) => {
		// 		return {...response.personIdentifier, 'origin_id': response['@id']};
		// 	})
		// 	.filter((v) => v);
		// const researchers = responses.map((response) => {
		// 	return {...response.researcher, 'origin_id': response['@id']};
		// }).filter((v) => v);
		// // ここは大元（@id）を見て、取得した方が良さそう
		// const creators = responses.map((response) => {
		// 	return {...response.creator, 'origin_id': response['@id']};
		// }).filter((v) => v);
		// const projects = responses.map((response) => {
		// 	return {...response.project, 'origin_id': response['@id']};
		// 	}).filter((v) => v);
		// const dataSourceIdentifiers = responses
		// 	.map((response) => {
		// 		return {...response.dataSourceIdentifier, 'origin_id': response['@id']};
		// 	})
		// 	.filter((v) => v);
		// const relatedProjects = responses
		// 	.map((response) => {
		// 		return {...response.relatedProject, 'origin_id': response['@id']};
		// 	})
		// 	.filter((v) => v);

		// const urls = responses.map((response) => {
		// 	return {...response.url, 'origin_id': response['@id']};
		// }).filter((v) => v);

		// writeCount(`${searchType}_kaken_debug_${query}.json`, {
		// 	projectIdentifiers,
		// 	personIdentifiers,
		// 	researchers,
		// 	creators,
		// 	projects,
		// 	relatedProjects,
		// 	dataSourceIdentifiers,
		// 	urls,
		// });

		// await new Promise((resolve) => setTimeout(resolve, 20000));

		// CiNiiResearchResponseに含まれるパラメータのうち、どのパラメータが取得されているかを確認する
		// const res = countCiniiResearchResponses(responses);

		// writeCount(`${searchType}_shallow_count_${params.q}.json`, res.shallowCount);
		// writeCount(`${searchType}_deep_count_${params.q}.json`, res.deepCount);

		// const typeProductIds = responses
		// 	.map((response) => {
		// 		// if (response.product && response.product.length !== 0) {
		// 		const typeProductIdsInProduct =
		// 			response.product
		// 				?.filter((product) => product['@type'] === 'Product')
		// 				.map((filteredProduct) => filteredProduct['@id']) ?? [];
		// 		const typeProductIdsInRelatedProduct =
		// 			response.relatedProduct
		// 				?.filter((product) => product['@type'] === 'Product')
		// 				.map((filteredProduct) => filteredProduct['@id']) ?? [];
		// 		return [...typeProductIdsInProduct, ...typeProductIdsInRelatedProduct];
		// 		// }
		// 	})
		// 	// .filter((v) => v)
		// 	.flat()
		// 	.filter((v) => v);

		// if (typeProductIds.length) {
		// 	const setTypeProductIds = Array.from(new Set(typeProductIds)).slice(0, 400);
		// 	const productResponses = await Promise.all(
		// 		setTypeProductIds.map((id) => ciniiResearchRequest(id))
		// 	);
		// 	const productRes = countCiniiResearchResponses(productResponses);
		// 	// writeCount(
		// 	// 	`product_${searchType}_person_shallow_count_${params.q}.json`,
		// 	// 	productRes.shallowCount
		// 	// );
		// 	// writeCount(
		// 	// 	`product_${searchType}_person_deep_count_${params.q}.json`,
		// 	// 	productRes.deepCount
		// 	// );
		// 	writeData(`product_responses_${query}`, productResponses);
		// }

		// if (searchType === 'articles') {
		// 	const creatorIds = responses
		// 		.map((research) => {
		// 			// if (research.creator && research.creator.length !== 0) {
		// 			const ids = research.creator?.map((creator) => creator['@id']) || [];
		// 			return ids;
		// 			// }
		// 			// console.log('person: creatorが存在しない');
		// 		})
		// 		// .filter((v) => v)
		// 		.flat()
		// 		.filter((v) => v);
		// 	const setCreatorIds = Array.from(new Set(creatorIds)).slice(0, 400);
		// 	const creatorResponses = await Promise.all(
		// 		setCreatorIds.map((id) => ciniiResearchRequest(id))
		// 	);
		// const personRes = countCiniiResearchResponses(creatorResponses);

		// const projectIdentifiers = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.projectIdentifier, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);
		// const personIdentifiers = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.personIdentifier, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);
		// const researchers = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.researcher, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);
		// // ここは大元（@id）を見て、取得した方が良さそう
		// const creators = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.creator, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);
		// const projects = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.project, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);
		// const dataSourceIdentifiers = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.dataSourceIdentifier, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);
		// const relatedProjects = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.relatedProject, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);

		// const urls = creatorResponses
		// 	.map((response) => {
		// 		return { ...response.url, origin_id: response['@id'] };
		// 	})
		// 	.filter((v) => v);

		// writeData(`person_responses_${query}`, creatorResponses);

		// writeCount(`person_kaken_debug_${query}.json`, {
		// 	projectIdentifiers,
		// 	personIdentifiers,
		// 	researchers,
		// 	creators,
		// 	projects,
		// 	relatedProjects,
		// 	dataSourceIdentifiers,
		// 	urls,
		// });

		// writeCount(`person_responses_${params.q}.json`, creatorResponses);
		// writeCount(`person_shallow_count_${params.q}.json`, personRes.shallowCount);
		// writeCount(`person_deep_count_${params.q}.json`, personRes.deepCount);
		// }
		// }
		// }

		// await new Promise((resolve) => setTimeout(resolve, 20000));
		// }
		// }
	})();
}
