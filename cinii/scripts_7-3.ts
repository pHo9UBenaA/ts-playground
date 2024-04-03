// docker compose exec node ./cinii/node_modules/.bin/ts-node ./cinii/scripts_4.ts
// article一覧から医中誌の情報のみを抽出

import { Workbook, Worksheet } from 'exceljs';
import { createReadStream, existsSync } from 'fs';
import { appendFile, unlink } from 'fs/promises';
import { createInterface } from 'readline';
import Chain, { chain } from 'stream-chain';
import { withParser } from 'stream-json/streamers/StreamValues';
import { setTimeout } from 'timers/promises';
import { ciniiResearchRequest } from './functions/cinii_research_request';
import { openSearchRequest } from './functions/opensearch_request';
import { CiNiiResearchResponse } from './interfaces/cinii_research_response';
import { CountType, OpenSearchRequestQuery, SearchType } from './interfaces/opensearch_request';

process.env.TZ = 'Asia/Tokyo';

const dirPrefix = 'cinii/7-3_aggregate_results';

/** Start */
const yearList = [2023, 2022] as const satisfies readonly number[];

const queryList = ['癌', 'がん'];

/**
 * OpenSearchAPIからデータを取得する（batchSizeLimit件を超えるまで再帰的に取得）
 * @param searchType - 検索データ種別 ex. articles
 * @param params - ex. { appid: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', format: 'json', q: 'cancer' }
 * @param offset - 取得開始位置（1度目のリクエストのOpenSearchRequestQuery.start） ex. 1
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

/** End */

const sheetName = 'Sheet1';

type ColumnKey =
	| 'conferenceId'
	| 'conferenceName'
	| 'conferenceType'
	| 'sessionName'
	| 'presentationId'
	| 'presentationName'
	| 'role'
	| 'author'
	| 'affiliation'
	| 'field'
	| 'title'
	| 'isMoreThan11'
	| 'abstract'
	| 'companyName'
	| 'isJointlyHeld';
const columns = [
	{ header: '学会ID', key: 'conferenceId' },
	{ header: '学会名', key: 'conferenceName' },
	{ header: '区分', key: 'conferenceType' },
	{ header: 'セッション名', key: 'sessionName' },
	{ header: '演題仮番号', key: 'presentationId' },
	{ header: '演題名', key: 'presentationName' },
	{ header: '役割', key: 'role' },
	{ header: '人物', key: 'author' },
	{ header: '施設', key: 'affiliation' },
	{ header: '領域', key: 'field' },
	{ header: '肩書', key: 'title' },
	{ header: '演者が11名以上', key: 'isMoreThan11' },
	{ header: '抄録', key: 'abstract' },
	{ header: '企業名', key: 'companyName' },
	{ header: '合同開催', key: 'isJointlyHeld' },
] satisfies { header: string; key: ColumnKey }[];

type PickArticleValue = Pick<
	CiNiiResearchResponse,
	'@id' | 'dc:title' | 'dataSourceIdentifier' | 'creator'
>;

type Result = {
	[key in ColumnKey]?: string;
};

const writeXlsx = async (filePath: string, data: Result[]) => {
	const workbook = new Workbook();

	let worksheet: Worksheet | undefined;

	if (existsSync(filePath)) {
		await workbook.xlsx.readFile(filePath);
		worksheet = workbook.getWorksheet(sheetName);
	} else {
		worksheet = workbook.addWorksheet(sheetName);
	}

	if (!worksheet) {
		throw new Error('worksheetが正常に定義されませんでした');
	}

	worksheet.columns = columns;

	// ヘッダーを設定（別のやり方がありそうだけど面倒なので一旦これで）
	worksheet.addRows(data);

	await workbook.xlsx.writeFile(filePath);
};

// const { chain } = require('stream-chain');
// const StreamValues = require('stream-json/streamers/StreamValues');

const japaneseText = /[\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Han}]/u;

const findJapaneseAuthorName = (people: CiNiiResearchResponse['foaf:Person']): string => {
	// console.log('tmpPeople', JSON.stringify(people, null, 2));
	if (!people) {
		return '';
	}

	for (const person of people) {
		const japaneseName = person?.['foaf:name']?.find((name) =>
			japaneseText.test(name?.['@value'] ?? '')
		);
		if (japaneseName && typeof japaneseName['@value'] === 'string') {
			// japaneseName['@value']からカンマ（,）を削除
			const ignoreComma = japaneseName['@value'].replace(/,/g, '');
			// japaneseName['@value']がjapaneseTextにマッチした場合は、スペース（ ）を削除
			return japaneseText.test(ignoreComma) ? ignoreComma.replace(/ /g, '') : ignoreComma;
		}
	}
	// 見つからない場合は全ての@valueから日本語のものを探す
	for (const person of people) {
		const japaneseName = person?.['foaf:name']?.find((name) =>
			japaneseText.test(name?.['@value'] ?? '')
		);
		if (japaneseName && typeof japaneseName['@value'] === 'string') {
			// カンマとスペースを削除
			return japaneseName['@value'].replace(/,/g, '').replace(/ /g, '');
		}
	}
	// 見つからない場合は英語名を返す
	for (const person of people) {
		const englishName = person?.['foaf:name']?.find((name) => name?.['@language'] === 'en');
		if (englishName && typeof englishName['@value'] === 'string') {
			// カンマを削除
			return englishName['@value'].replace(/,/g, '');
		}
	}
	// それでも見つからない場合は@valueの一つ目の要素を返す
	for (const person of people) {
		const firstValue = person?.['foaf:name']?.[0];
		if (firstValue && typeof firstValue['@value'] === 'string') {
			// カンマを削除
			return firstValue['@value'].replace(/,/g, '');
		}
	}
	return ''; // 該当する要素が見つからない場合
};

const findJapaneseInstitutionName = (institutions: CiNiiResearchResponse['career']): string => {
	// console.log('tmpInstitutions', JSON.stringify(institutions, null, 2));
	if (!institutions) {
		return '';
	}

	for (const institution of institutions) {
		const japaneseName = institution?.institution?.notation?.find(
			(name) => name?.['@language'] === 'ja'
		);
		if (japaneseName && typeof japaneseName['@value'] === 'string') {
			// TODO: 要確認 japaneseName['@value']からカンマ（,）を削除
			// const ignoreComma = japaneseName['@value'].replace(/,/g, '');
			return japaneseName['@value'];
		}
	}
	// 見つからない場合は全ての@valueから日本語のものを探す
	for (const institution of institutions) {
		const japaneseName = institution?.institution?.notation?.find((name) =>
			japaneseText.test(name?.['@value'] ?? '')
		);
		if (japaneseName && typeof japaneseName['@value'] === 'string') {
			// TODO 要確認 カンマを削除、スペースを削除した方が良いか
			return japaneseName['@value'];
		}
	}
	// 見つからない場合は英語名を返す
	for (const institution of institutions) {
		const englishName = institution?.institution?.notation?.find(
			(name) => name?.['@language'] === 'en'
		);
		if (englishName && typeof englishName['@value'] === 'string') {
			// TODO 要確認 カンマを削除、スペースを削除した方が良いか
			return englishName['@value'];
		}
	}
	// それでも見つからない場合は@valueの一つ目の要素を返す
	for (const institution of institutions) {
		const firstValue = institution?.institution?.notation?.[0];
		if (firstValue && typeof firstValue['@value'] === 'string') {
			// TODO 要確認 カンマを削除、スペースを削除した方が良いか
			return firstValue['@value'];
		}
	}
	return ''; // 該当する要素が見つからない場合
};

const getDataSourceIdentifierType = (datasource: CiNiiResearchResponse['dataSourceIdentifier']) => {
	if (!datasource) {
		throw new Error('https://support.nii.ac.jp/ja/cir/r_json と異なるかも');
	}

	const dataSourceIdentifiers = datasource?.map((identifier) => identifier?.['@type']) ?? [];
	return [...new Set(dataSourceIdentifiers)];
};

const resetAppendFile = async (filePath: string) => {
	if (existsSync(filePath)) {
		await unlink(filePath);
	}
};

type GetArticleResult = Pick<Result, 'presentationName' | 'sessionName'>;
const getArticleResult = (pickArticleValue: PickArticleValue): GetArticleResult => {
	if (!pickArticleValue['dc:title'] || !pickArticleValue?.['dataSourceIdentifier']?.length) {
		throw new Error('getArticleResult: dc:titleかdataSourceIdentifierが取得できませんでした');
	}

	return {
		presentationName: pickArticleValue?.['dc:title']?.[0]?.['@value'],
		sessionName: getDataSourceIdentifierType(pickArticleValue['dataSourceIdentifier']).join(
			', '
		),
	};
};

type GetAuthorResult = Pick<Result, 'author' | 'conferenceType' | 'affiliation'>;
const getAuthorResults = async (pickArticleValue: PickArticleValue): Promise<GetAuthorResult[]> => {
	const { '@id': articleId, creator: articleCreators } = pickArticleValue;

	let results: GetAuthorResult[] = [];

	if (!articleCreators) {
		console.log(`${articleId} にはcreatorがありませんでした`);
		return results;
	}

	for await (const creator of articleCreators) {
		if (!creator?.['@id']) {
			throw new Error(`${articleId}のcreator['@id']が取得できませんでした`);
		}

		const result = await ciniiResearchRequest(`${creator['@id']}.json`);

		const authorName: string = findJapaneseAuthorName(result['foaf:Person']);
		const authorAffiliation: string = findJapaneseInstitutionName(result.career);
		const authorDataSource: string = getDataSourceIdentifierType(
			result.dataSourceIdentifier
		).join(', ');

		if (!authorName || !authorDataSource) {
			throw new Error(
				`${creator['@id']}のauthorNameかauthorDataSourceが取得できませんでした`
			);
		}

		results.push({
			author: authorName,
			conferenceType: authorDataSource,
			affiliation: authorAffiliation,
		});
	}

	return results;
};

type GetResult = GetAuthorResult & GetArticleResult;
const getResults = async (
	pickArticleValues: PickArticleValue[]
): Promise<{
	results: GetResult[];
	resultsIgnoreNoAuthor: GetResult[];
	resultsIgnoreNoAuthorAndNoAffiliation: GetResult[];
}> => {
	// 著者なし=著者の紐づいていない論文データ
	// 施設名なし=論文データに紐づいている著者に対し、1人も施設名が紐づいていないデータ

	// 著者なしの論文を含むデータ
	let results: GetResult[] = [];
	// 著者なしの論文を含まないデータ
	let resultsIgnoreNoAuthor: GetResult[] = [];
	// 著者なしの論文を含まず、施設名なしを含まないデータ
	let resultsIgnoreNoAuthorAndNoAffiliation: GetResult[] = [];

	for await (const pickArticleValue of pickArticleValues) {
		const articleResult = getArticleResult(pickArticleValue);
		const authorResults = await getAuthorResults(pickArticleValue);

		// いずれかの著者に施設名が紐づいているか
		const isAffiliation = authorResults.some((authorResult) => !!authorResult.affiliation);

		for await (const authorResult of authorResults) {
			results.push({
				...articleResult,
				...authorResult,
			});
			resultsIgnoreNoAuthor.push({
				...articleResult,
				...authorResult,
			});
			if (isAffiliation) {
				resultsIgnoreNoAuthorAndNoAffiliation.push({
					...articleResult,
					...authorResult,
				});
			}
		}

		// 著者の紐づいていない論文
		if (!authorResults.length) {
			results.push({
				...articleResult,
			});
		}

		const now = new Date();
		// console.log(`${pickArticleValue['@id']}, now: ${now.getHours()}時${now.getMinutes()}分`);
	}

	return {
		results,
		resultsIgnoreNoAuthor,
		resultsIgnoreNoAuthorAndNoAffiliation,
	};
};

const isMedicalJournal = (article: CiNiiResearchResponse): boolean => {
	// productIdentifierの@valueに https://search.jamas.or.jp/link/ui という文字列が含まれる値が存在するか
	const includedProductIdentifier = article.productIdentifier?.some((productIdentifier) => {
		return productIdentifier?.identifier?.['@value']?.startsWith(
			'https://search.jamas.or.jp/link/ui'
		);
	});

	// urlの@idに https://search.jamas.or.jp/link/ui という文字列が含まれる値が存在するか
	const includedUrl = article.url?.some((url) => {
		return url?.['@id']?.startsWith('https://search.jamas.or.jp/link/ui');
	});

	return !!includedProductIdentifier || !!includedUrl;
};

const readIdDataAndFetchCiNiiAndSave = async (
	year: (typeof yearList)[number],
	query: (typeof queryList)[number]
) => {
	const appendArticlesFilePath = `${dirPrefix}/${year}_${query}_articles.jsonl`;
	const appendPickArticlesFilePath = `${dirPrefix}/2023_2022_${query}_aggregate_results.xlsx`;
	const appendPickArticlesSplitYearFilePath = `${dirPrefix}/${year}_${query}_aggregate_results.xlsx`;
	const appendIgnoreNoAuthorPickArticlesFilePath = `${dirPrefix}/2023_2022_${query}_aggregate_results_ignore_no_author.xlsx`;
	const appendIgnoreNoAuthorPickArticlesSplitYearFilePath = `${dirPrefix}/${year}_${query}_aggregate_results_ignore_no_author.xlsx`;
	const appendIgnoreNoAuthorAndNoAffiliationPickArticlesFilePath = `${dirPrefix}/2023_2022_aggregate_results_ignore_no_author_and_no_affiliation.xlsx`;
	const appendIgnoreNoAuthorAndNoAffiliationPickArticlesSplitYearFilePath = `${dirPrefix}/${year}_${query}_aggregate_results_ignore_no_author_and_no_affiliation.xlsx`;
	// await resetAppendFile(appendPickArticlesFilePath);

	const stream = createReadStream(`${dirPrefix}/filtered_${query}_${year}_id_not_uniq.txt`);
	const rl = createInterface({
		input: stream,
		crlfDelay: Infinity,
	});

	let articles: CiNiiResearchResponse[] = [];
	let pickArticles: PickArticleValue[] = [];

	const articlesToJsonl = async () => {
		await appendFile(
			appendArticlesFilePath,
			articles.map((article) => JSON.stringify(article)).join('\n') + '\n'
		);
		articles = [];
	};

	const pickArticlesToXlsx = async () => {
		const { results, resultsIgnoreNoAuthor, resultsIgnoreNoAuthorAndNoAffiliation } =
			await getResults(pickArticles);

		// 著者なしの論文を含むデータ
		await writeXlsx(appendPickArticlesFilePath, results);
		// 著者なしの論文を含むデータ（年ごと）
		await writeXlsx(appendPickArticlesSplitYearFilePath, results);

		// 著者なしの論文を含まないデータ
		await writeXlsx(appendIgnoreNoAuthorPickArticlesFilePath, resultsIgnoreNoAuthor);
		// 著者なしの論文を含まないデータ（年ごと）
		await writeXlsx(appendIgnoreNoAuthorPickArticlesSplitYearFilePath, resultsIgnoreNoAuthor);

		// 著者なしかつ施設名なしの論文を含まないデータ
		await writeXlsx(
			appendIgnoreNoAuthorAndNoAffiliationPickArticlesFilePath,
			resultsIgnoreNoAuthorAndNoAffiliation
		);
		// 著者なしかつ施設名なしの論文を含まないデータ（年ごと）
		await writeXlsx(
			appendIgnoreNoAuthorAndNoAffiliationPickArticlesSplitYearFilePath,
			resultsIgnoreNoAuthorAndNoAffiliation
		);

		pickArticles = [];
	};

	for await (const articleId of rl) {
		const response = await ciniiResearchRequest(`${articleId}.json`);

		if (!isMedicalJournal(response)) {
			continue;
		}

		articles.push(response);
		pickArticles.push({
			'@id': response['@id'],
			'dc:title': response['dc:title'],
			dataSourceIdentifier: response['dataSourceIdentifier'],
			creator: response['creator'],
		});

		if (articles.length >= 100) {
			console.log(`${response['@id']}まで終了しました`);
			console.log(
				'100件分のデータを取得したました',
				new Date().getHours(),
				new Date().getMinutes()
			);
			const now = new Date();
			console.log(`${response['@id']}, now: ${now.getHours()}時${now.getMinutes()}分`);
			await articlesToJsonl();
			await pickArticlesToXlsx();
			await setTimeout(2000);
		}

		await setTimeout(100);
	}

	if (articles.length) {
		await articlesToJsonl();
		await pickArticlesToXlsx();
	}
};

(async () => {
	// for await (const query of queryList) {
	// 	for await (const year of yearList) {
	// 		{
	// 			const params: OpenSearchRequestQuery = {
	// 				format: 'json',
	// 				q: query,
	// 				count: 200,
	// 				from: year.toString(),
	// 				until: year.toString(),
	// 			} as const;

	// 			await fetchOpenSearchResponse(
	// 				// searchType,
	// 				'articles',
	// 				params,
	// 				1
	// 			);
	// 		}
	// 	}
	// }

	for await (const query of queryList) {
		for await (const year of yearList) {
			if (query === '癌' && year === 2023) {
				console.log('2023年,キーワード癌の処理はスキップします')
				continue
			}
			await readIdDataAndFetchCiNiiAndSave(year, query);
			console.log(`${year}年,キーワード${query}の処理が完了しました`);
		}
	}
})();

if (false) {
	const readIdDataAndFetchCiNiiAndSave = async (year: (typeof yearList)[number]) => {
		const appendFilePath = `${dirPrefix}/5_aggregate_results/${year}_aggregate_results.xlsx`;
		await resetAppendFile(appendFilePath);

		const pipeline: Chain = chain([
			createReadStream(
				`${dirPrefix}/state_4_author_details/${year}_2_target_author_details.jsonl`
			),
			withParser(),
			// streamArray()
		]);

		// pipelineを100件ずつ
		let items: CiNiiResearchResponse[] = [];
		for await (const item of pipeline) {
			items.push(item.value);
			console.log(item.value['@id']);

			if (items.length >= 100) {
				const results = items.map((value) => {
					const dataSource = getDataSourceIdentifierType(
						value['dataSourceIdentifier']
					).join(', ');
					const author = findJapaneseAuthorName(value['foaf:Person']);
					const affiliation = findJapaneseInstitutionName(value['career']);
					return { conferenceType: dataSource, author, affiliation };
				});

				// console.log(dataSource);
				// console.log(author);
				// console.log(affiliation);
				// console.log('\n');

				writeXlsx(appendFilePath, results);

				items = [];
				await setTimeout(900);
			}

			await setTimeout(100);
		}

		if (items.length) {
			const results = items.map((value) => {
				const dataSource = getDataSourceIdentifierType(value['dataSourceIdentifier']).join(
					', '
				);
				const author = findJapaneseAuthorName(value['foaf:Person']);
				const affiliation = findJapaneseInstitutionName(value['career']);
				return { conferenceType: dataSource, author, affiliation };
			});

			// console.log(dataSource);
			// console.log(author);
			// console.log(affiliation);
			// console.log('\n');

			writeXlsx(appendFilePath, results);

			items = [];
			await setTimeout(1000);
		}
	};

	// (async () => {
	// 	for await (const year of yearList) {
	// 		if (year === 2024 || year === 2023 || year === 2022) {
	// 			await readIdDataAndFetchCiNiiAndSave(year);
	// 		}
	// 	}
	// })();
}
