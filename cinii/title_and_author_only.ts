import { appendFile } from 'fs/promises';
import * as gaxios from 'gaxios';
import { setTimeout } from 'timers/promises';
import { CountType, OpenSearchRequestQuery, SearchType } from './interfaces/opensearch_request';
import { OpenSearchResponse } from './interfaces/opensearch_response';
import { openSearchRequest } from './functions/opensearch_request';

const dirPrefix = 'cinii';

// const dataSourceList = [
// 	undefined,
// 	'CROSSREF',
// 	'CIA',
// 	'KAKEN',
// 	'JALC',
// 	'NDL',
// 	'NDL_DC',
// 	'IRDB',
// 	'INTEGBIO',
// 	'PUBMED',
// 	'NIKKEI_BP',
// 	'MDR',
// ];

const yearList = [
	2024, 2023, 2022,
	// 2021, 2020, 2019, 2018, 2017,
	// 2016, 2015,
	// 2014,
] satisfies number[];

const queryList = ['がん', '癌'];

// const sortList = [0, 1] satisfies SortType[];
// const sortList = [0, 1, 4, 10] satisfies SortType[];

// const languageList = [undefined, 'ja'];


/**
 * 取り急ぎ
 * offset+countが1000以下か（CiNiiのOpenSearchAPIだとstartが10000を超える範囲を指定できないため）
 */
const isOffsetAndCountLimit = (offset: number, count: CountType): boolean => {
	return offset + count <= 10000;
};

/**
 * 取り急ぎ
 * 1900~現在の年の範囲であるか
 */
const isFromAndUntilRange = (fromFullYear: number, untilFullYear: number): boolean => {
	const lowerYear = 1900;
	const currentYear = new Date().getFullYear();
	const isFromRange = fromFullYear >= lowerYear && fromFullYear <= currentYear;
	const isUntilRange = untilFullYear >= lowerYear && untilFullYear <= currentYear;
	return isFromRange && isUntilRange;
};

/**
 * 取り急ぎ
 * 1~10000の範囲であるか
 */
const isBatchSizeLimitRange = (batchSizeLimit: number): boolean => {
	return batchSizeLimit >= 1 && batchSizeLimit <= 10000;
};

/**
 * 日本語が含まれるかどうか
 */
const japaneseText = /[\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Han}]/u;

/**
 * OpenSearchAPIからデータを取得する（batchSizeLimit件を超えるまで再帰的に取得）
 * @param searchType - 検索データ種別 ex. articles
 * @param params - ex. { appid: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', format: 'json', q: 'cancer' }
 * @param offset - 取得開始位置（1度目のリクエストのOpenSearchRequestQuery.start） ex. 1
 * @param from - ex. new Date('2024-01-01')
 * @param until - ex. new Date('2024-01-01')
 * @param count - 取得件数（OpenSearchRequestQuery.count） ex. 200
 * @param batchSizeLimit - 一度に取得する件数の上限 ex. 1000
 * @returns
 *
 * TODO: readonly args
 */
const fetchOpenSearchResponse = async (
	searchType: SearchType,
	params: Readonly<OpenSearchRequestQuery>,
	offset: number,
	count: CountType = 200,
	batchSizeLimit: number = 10000
): Promise<void> => {
	// if (!isOffsetAndCountLimit(offset, count)) {
	// 	throw new Error('offset+countは10000以下である必要があります');
	// }

	// if (!isFromAndUntilRange(fromFullYear, untilFullYear)) {
	// 	throw new Error('fromとuntilは1900~現在の年の範囲である必要があります');
	// }

	// if (!isBatchSizeLimitRange(batchSizeLimit)) {
	// 	throw new Error('batchSizeLimitは1~10000の範囲である必要があります');
	// }

	const iterateCount = Math.floor(batchSizeLimit / count);

	for (let i = 0; i < iterateCount; i++) {
		// Note: response['opensearch:startIndex']と同様の値と想定
		const start = offset + i * count;

		// Note: currentParams.countはresponse['opensearch:itemsPerPage']と同様の値と想定
		const response = await openSearchRequest(searchType, {
			...params,
			count,
			start,
		});

		const paramsQuery = params.q ?? 'none';
		const paramsFrom = params.from ?? 'target_year';
		// 日本語タイトルでないかつ日本語著者がいないものを除外
		const filteredItemIds = response.items
			.filter((item) => {
				const isTitleJa = japaneseText.test(item.title);
				const isAuthor = item['dc:creator']?.some((creator) => japaneseText.test(creator));
				return isTitleJa || isAuthor;
			})
			.map((item) => item['@id']);

		if (filteredItemIds.length !== 0) {
			await appendFile(
				`${dirPrefix}/filtered_${paramsQuery}_${paramsFrom}_id_not_uniq.txt`,
				filteredItemIds.join('\n') + '\n'
			);
		}

		console.log(
			`${dirPrefix}/filtered_${paramsQuery}_${paramsFrom}_id_not_uniq.txt`,
			`${start + count - 1}件目まで取得できる処理が取得`
		);

		// 次のページがない場合は終了
		const nextStart = start + count;
		if (nextStart >= response['opensearch:totalResults']) {
			console.log(
				'次のページがないため終了',
				paramsFrom,
				response['opensearch:totalResults']
			);
			break;
		}
	}
};

(async () => {
	for await (const year of yearList) {
		for await (const query of queryList) {
			{
				const params: OpenSearchRequestQuery = {
					format: 'json',
					q: query,
					count: 200,
					from: year.toString(),
					until: year.toString(),
				} as const;

				await fetchOpenSearchResponse(
					// searchType,
					'articles',
					params,
					1
				);
			}
		}
	}
})();
