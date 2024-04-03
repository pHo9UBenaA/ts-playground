import * as gaxios from 'gaxios';
import { setTimeout } from 'timers/promises';
import { CountType, OpenSearchRequestQuery, SearchType } from '../interfaces/opensearch_request';
import { OpenSearchResponse } from '../interfaces/opensearch_response';

/**
 * OpenSearchAPIからデータを取得する
 * https://support.nii.ac.jp/ja/cinii/api/developer に記載はないが、1秒1アクセス以上でのAPIの利用は保証の限りではないとのことなので、1.5秒以上の間隔を空けるようにしている
 * @param searchType - 検索種別 ex. articles
 * @param params - ex. { appid: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', format: 'json', q: 'cancer' }
 * @returns
 */
export const openSearchRequest = async (
	searchType: SearchType,
	params: OpenSearchRequestQuery
): Promise<OpenSearchResponse> => {
	const response = await gaxios.request<OpenSearchResponse>({
		url: `https://cir.nii.ac.jp/opensearch/${searchType}`,
		params,
	});
	// 無駄があるが管理が面倒なので一旦ここで遅延
	await setTimeout(1500);
	return response.data;
};

/**
 * 取り急ぎ
 * offset+countが1000以下か
 * CiNiiのOpenSearchAPIだとstartが10000を超える範囲を指定できないため
 */
const isOffsetAndCountLimit = (offset: number, count: CountType): boolean => {
	return offset + count <= 10000;
};

/**
 * 取り急ぎ
 * 1~10000の範囲であるか
 */
const isBatchSizeLimitRange = (batchSizeLimit: number): boolean => {
	return batchSizeLimit >= 1 && batchSizeLimit <= 10000;
};

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
export const fetchOpenSearchResponse = async (
	searchType: SearchType,
	params: Readonly<OpenSearchRequestQuery>,
	offset: number,
	count: CountType = 200,
	batchSizeLimit: number = 10000
): Promise<{ responses: OpenSearchResponse[]; nextOffset: number | null }> => {
	let responses: OpenSearchResponse[] = [];
	let nextOffset: number | null = null;

	if (!isOffsetAndCountLimit(offset, count)) {
		throw new Error('offset+countは10000以下である必要があります');
	}

	if (!isBatchSizeLimitRange(batchSizeLimit)) {
		throw new Error('batchSizeLimitは1~10000の範囲である必要があります');
	}

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
		responses.push(response);

		nextOffset = start + count;

		// 次の繰り返しで上限を超える場合は終了
		const totalCount = responses.reduce((acc, res) => acc + res.items.length, 0);
		if (totalCount + count > batchSizeLimit) {
			console.log('上限を超えるため終了');
			break;
		}

		// 次のページがない場合は終了
		if (nextOffset >= response['opensearch:totalResults']) {
			console.log('次のページがないため終了');
			nextOffset = null;
			break;
		}
	}

	return { responses, nextOffset };
};
