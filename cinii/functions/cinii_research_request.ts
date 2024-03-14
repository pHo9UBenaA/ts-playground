import * as gaxios from 'gaxios';
import { setTimeout } from 'timers/promises';
import { CiNiiResearchResponse } from '../interfaces/cinii_research_response';

/**
 *
 * https://support.nii.ac.jp/ja/cinii/api/developer に記載はないが、1秒1アクセス以上でのAPIの利用は保証の限りではないとのことなので、1.5秒以上の間隔を空けるようにしている
 * @param url - ex. https://cir.nii.ac.jp/crid/xxxxxxxxxxxxxxxxxxx.json
 * @returns
 */
export const ciniiResearchRequest = async (url: string): Promise<CiNiiResearchResponse> => {
	const res = await gaxios.request<CiNiiResearchResponse>({url});
	await setTimeout(1500);
	return res.data;
};
