import { SearchType, SortType } from '../interfaces/opensearch_request';

/**
 * 取得対象の検索種別
 * @description https://cir.nii.ac.jp/opensearch/${searchType}
 * @see https://support.nii.ac.jp/ja/cir/r_opensearch
 */
export const searchTypes = {
	all: 'すべて検索',
	data: '研究データ',
	articles: '論文',
	books: '本',
	dissertations: '博士論文',
	projects: 'プロジェクト',
} as const satisfies Readonly<{ [key in SearchType]: string }>;

/**
 * 取得対象のフリーワード
 * @memberof type OpenSearchRequestQuery.q（うまくDocかけないから一旦適当に）
 * @see https://support.nii.ac.jp/ja/cir/r_opensearch
 */
export const queryList = [
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

/**
 * 取得対象のデータ種別
 * @memberof type OpenSearchRequestQuery.type（うまくDocかけないから一旦適当に）
 * @see https://support.nii.ac.jp/ja/cir/r_opensearch
 */
export const dataSourceList = [
	'CROSSREF',
	'CIA',
	'KAKEN',
	'JALC',
	'NDL',
	'NDL_DC',
	'IRDB',
	'INTEGBIO',
	'PUBMED',
	'NIKKEI_BP',
	'MDR',
] as const; // satisfies DataSourceType[];

/**
 * 取得対象のソート種別
 * @example params = sortOrderList.map((sortOrder) => { param: { OpenSearchRequestQuery.sortorder)
 * @see https://support.nii.ac.jp/ja/cir/r_opensearch
 */
export const sortOrderList = [0, 1, 4, 10] as const satisfies readonly SortType[];

/**
 * 取得対象の年度
 */
export const yearList = [
	2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
] as const satisfies readonly number[];
