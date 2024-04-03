// docker compose exec node ./cinii/node_modules/.bin/ts-node ./cinii/scripts_4.ts

import { Workbook } from 'exceljs';
import { createReadStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import Chain, { chain } from 'stream-chain';
import { withParser } from 'stream-json/streamers/StreamValues';
import { setTimeout } from 'timers/promises';
import { yearList } from './constants/opensearch_request_param';
import { CiNiiResearchResponse } from './interfaces/cinii_research_response';

const dirPrefix = 'cinii';

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
	let worksheet;

	if (existsSync(filePath)) {
		await workbook.xlsx.readFile(filePath);
		worksheet = workbook.getWorksheet(sheetName);
		worksheet.columns = columns;
	} else {
		worksheet = workbook.addWorksheet(sheetName);
		worksheet.columns = columns;
	}

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
		const japaneseName = person['foaf:name']?.find((name) => japaneseText.test(name['@value']));
		if (japaneseName && typeof japaneseName['@value'] === 'string') {
			// japaneseName['@value']からカンマ（,）を削除
			const ignoreComma = japaneseName['@value'].replace(/,/g, '');
			// japaneseName['@value']がjapaneseTextにマッチした場合は、スペース（ ）を削除
			return japaneseText.test(ignoreComma) ? ignoreComma.replace(/ /g, '') : ignoreComma;
		}
	}
	// 見つからない場合は全ての@valueから日本語のものを探す
	for (const person of people) {
		const japaneseName = person['foaf:name']?.find((name) => japaneseText.test(name['@value']));
		if (japaneseName && typeof japaneseName['@value'] === 'string') {
			// カンマとスペースを削除
			return japaneseName['@value'].replace(/,/g, '').replace(/ /g, '');
		}
	}
	// 見つからない場合は英語名を返す
	for (const person of people) {
		const englishName = person['foaf:name']?.find((name) => name['@language'] === 'en');
		if (englishName && typeof englishName['@value'] === 'string') {
			// カンマを削除
			return englishName['@value'].replace(/,/g, '');
		}
	}
	// それでも見つからない場合は@valueの一つ目の要素を返す
	for (const person of people) {
		const firstValue = person['foaf:name']?.[0];
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
			(name) => name['@language'] === 'ja'
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
			japaneseText.test(name['@value'])
		);
		if (japaneseName && typeof japaneseName['@value'] === 'string') {
			// TODO 要確認 カンマを削除、スペースを削除した方が良いか
			return japaneseName['@value'];
		}
	}
	// 見つからない場合は英語名を返す
	for (const institution of institutions) {
		const englishName = institution?.institution?.notation?.find(
			(name) => name['@language'] === 'en'
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

const getDatasourceIdentifierType = (datasource: CiNiiResearchResponse['dataSourceIdentifier']) => {
	if (!datasource) {
		throw new Error('https://support.nii.ac.jp/ja/cir/r_json と異なるかも');
	}

	const dataSourceIdentifiers = datasource?.map((identifier) => identifier['@type']) ?? [];
	return [...new Set(dataSourceIdentifiers)];
};

const resetAppendFile = async (filePath: string) => {
	if (existsSync(filePath)) {
		await unlink(filePath);
	}
};

type GetArticleResult = Pick<Result, 'presentationName' | 'sessionName'>;
const getArticleResult = (pickArticleValue: PickArticleValue): GetArticleResult => {
	if (!pickArticleValue['dc:title'] || !pickArticleValue['dataSourceIdentifier'].length) {
		throw new Error('getArticleResult: dc:titleかdataSourceIdentifierが取得できませんでした');
	}

	return {
		presentationName: pickArticleValue['dc:title'][0]['@value'],
		sessionName: getDatasourceIdentifierType(pickArticleValue['dataSourceIdentifier']).join(
			', '
		),
	};
};

type GetAuthorResult = Pick<Result, 'author' | 'conferenceType' | 'affiliation'>;
const getAuthorResults = async (
	year: number,
	pickArticleValue: PickArticleValue
): Promise<GetAuthorResult[]> => {
	const { '@id': articleId, creator: articleCreators } = pickArticleValue;

	let results: GetAuthorResult[] = [];

	if (!articleCreators) {
		console.log(`${articleId} にはcreatorがありませんでした`);
		return results;
	}

	for await (const creator of articleCreators) {
		let authorName: string;
		let authorAffiliation: string;
		let authorDataSource: string;

		const creatorId = `${creator['@id']}.json`;

		const pipeline: Chain = chain([
			createReadStream(`${dirPrefix}/4_author_detail/${year}_2_target_author_details.jsonl`),
			withParser(),
			// streamArray()
		]);

		/** TODO: NDJSONはLinuxのsortコマンドでソート済みなので、ストリームで二分探索できるかも **/
		for await (const authorKV of pipeline) {
			if (creatorId === authorKV.value['@id']) {
				authorName = findJapaneseAuthorName(authorKV.value['foaf:Person']);
				authorAffiliation = findJapaneseInstitutionName(authorKV.value['career']);
				authorDataSource = getDatasourceIdentifierType(
					authorKV.value['dataSourceIdentifier']
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

				pipeline.destroy();

				break;
			}
			await setTimeout(1);
		}
	}

	return results;
};

type GetResult = GetAuthorResult & GetArticleResult;
const getResults = async (
	year: number,
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
		const authorResults = await getAuthorResults(year, pickArticleValue);

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
	}

	return {
		results,
		resultsIgnoreNoAuthor,
		resultsIgnoreNoAuthorAndNoAffiliation,
	};
};

const readIdDataAndFetchCiNiiAndSave = async (year: number) => {
	const appendFilePath = `${dirPrefix}/5-2_aggregate_results/${year}_aggregate_results.xlsx`;
	const appendIgnoreNoAuthorFilePath = `${dirPrefix}/5-2_aggregate_results/${year}_aggregate_results_ignore_no_author.xlsx`;
	const appendIgnoreNoAuthorAndNoAffiliationFilePath = `${dirPrefix}/5-2_aggregate_results/${year}_aggregate_results_ignore_no_author_and_no_affiliation.xlsx`;
	await resetAppendFile(appendFilePath);
	await resetAppendFile(appendIgnoreNoAuthorFilePath);
	await resetAppendFile(appendIgnoreNoAuthorAndNoAffiliationFilePath);

	const pipeline: Chain = chain([
		createReadStream(`${dirPrefix}/_temp2/adjust_filtered_${year}_cancer_articles.jsonl`),
		withParser(),
		// streamArray()
	]);

	let articles: PickArticleValue[] = [];

	const articlesToXlsx = async () => {
		const { results, resultsIgnoreNoAuthor, resultsIgnoreNoAuthorAndNoAffiliation } =
			await getResults(year, articles);
		// 著者なしの論文を含むデータ
		await writeXlsx(appendFilePath, results);
		// 著者なしの論文を含まないデータ
		await writeXlsx(appendIgnoreNoAuthorFilePath, resultsIgnoreNoAuthor);
		// 著者なしの論文を含まず、各論文のいずれかの著者に施設名が紐づいているデータ
		await writeXlsx(
			appendIgnoreNoAuthorAndNoAffiliationFilePath,
			resultsIgnoreNoAuthorAndNoAffiliation
		);
		articles = [];
	};

	for await (const articleKV of pipeline) {
		const articlesValue: CiNiiResearchResponse = articleKV.value;
		articles.push({
			'@id': articlesValue['@id'],
			'dc:title': articlesValue['dc:title'],
			dataSourceIdentifier: articlesValue['dataSourceIdentifier'],
			creator: articlesValue['creator'],
		});

		if (articles.length >= 100) {
			const now = new Date();
			console.log(`${articleKV.key}件目, now: ${now.getHours()}時${now.getMinutes()}分`);
			await articlesToXlsx();
			await setTimeout(3000);
		}

		await setTimeout(100);
	}

	if (articles.length) {
		await articlesToXlsx();
	}
};

(async () => {
	for await (const year of [2024, 2023, 2022]) {
		await readIdDataAndFetchCiNiiAndSave(year);
		console.log(`${year}年の処理が完了しました`);
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
					const dataSource = getDatasourceIdentifierType(
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
				const dataSource = getDatasourceIdentifierType(value['dataSourceIdentifier']).join(
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

	(async () => {
		for await (const year of yearList) {
			if (year === 2024 || year === 2023 || year === 2022) {
				await readIdDataAndFetchCiNiiAndSave(year);
			}
		}
	})();
}
