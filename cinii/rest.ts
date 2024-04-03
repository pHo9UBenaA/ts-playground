import { appendFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';
import { fetchOpenSearchResponse } from './functions/opensearch_request';
import { OpenSearchRequestQuery, SortType } from './interfaces/opensearch_request';

const dirPrefix = 'cinii';

// const sortList = [0, 1] satisfies SortType[];
const sortList = [0, 1, 4, 10] satisfies SortType[];

const year = 2021;

(async () => {
	for await (const order of sortList) {
		{
			const params: OpenSearchRequestQuery = {
				appid: process.env.CINII_APP_ID,
				format: 'json',
				q: 'cancer',
				sortorder: order,
				count: 200,
			} as const;

			// for await (const year of yearList) {
			const fromAndUntilDate: Date = new Date(year, 0, 1);

			const { responses: openSearchResponses } = await fetchOpenSearchResponse(
				// searchType,
				'articles',
				params,
				1,
				fromAndUntilDate,
				fromAndUntilDate
			);

			await appendFile(
				`${dirPrefix}/${year}/${year}_${order}_id_not_uniq.txt`,
				openSearchResponses
					.map((res) => res.items)
					.flat()
					.map((item) => item['@id'])
					.join('\n')
			);
			await setTimeout(20000);
			// }

            console.log(JSON.stringify(openSearchResponses, null, 2));
		}
	}
})();
