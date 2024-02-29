// cp cinii/.env.example cinii/.env
// docker compose exec node ./cinii/node_modules/.bin/ts-node ./cinii/script.ts | pbcopy

import axios from 'axios';

// https://cir.nii.ac.jp/openurl/query の「rft.issn」パラメータを指定し、結果をconsoleで出力する
const search_type = {
	すべて検索: 'all',
	研究データ: 'data',
	論文: 'articles',
	本: 'books',
	博士論文: 'dissertations',
	プロジェクト: 'projects',
} as const;

Object.entries(search_type).forEach(([_, value]) => {
	if (value === 'all') return;

	const url = `https://cir.nii.ac.jp/opensearch/${value}`;
	// const url = `https://cir.nii.ac.jp/crid/1050001337660654208.json`;

	const params = {
		appid: process.env.CINII_APP_ID,
		format: 'json',
		q: '鬱',
		count: 100
		// issn: '13468812',
	} as const;

	axios.get(url, { params }).then((response) => {
		// console.log(typeof response.data)
		console.log(JSON.stringify(response.data));
	});
});

