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
];

const writeXlsx = async (
	filePath: string,
	data: {
		conferenceType: string;
		author: string;
		affiliation: string;
	}[]
) => {
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

const readIdDataAndFetchCiNiiAndSave = async () => {
	const appendFilePath = `${dirPrefix}/5_aggregate_results/2022-2024_aggregate_results.xlsx`;
	await resetAppendFile(appendFilePath);

	const pipeline: Chain = chain([
		createReadStream(`${dirPrefix}/4_author_detail/2024_2023_2022_uniq.jsonl`),
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
	await readIdDataAndFetchCiNiiAndSave();
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
