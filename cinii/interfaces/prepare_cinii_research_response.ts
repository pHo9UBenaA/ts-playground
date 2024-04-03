import {
	keyMapper,
	nestKeyMapper,
} from '../constants/cinii_research_response_property_name_mapper';
import { CiNiiResearchResponse } from './cinii_research_response';

export const forXlsxWsHeader = (wsData: object[]) => {
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

export const forXlsx = (object: CiNiiResearchResponse) => {
	let result = {};
	Object.keys(object).forEach((key) => {
		const resultKey = keyMapper[key] || key;
		if (typeof object[key] === 'object' && object[key] !== null) {
			if (nestKeyMapper.hasOwnProperty(key)) {
				if (Array.isArray(object[key])) {
					object[key].map((v, i) => {
						const arrayResultKey = `${resultKey}-${i}`;
						const arrayResultValue = Object.keys(v).reduce((acc, subKey) => {
							if (nestKeyMapper[key].hasOwnProperty(subKey)) {
								acc[nestKeyMapper[key][subKey]] = v[subKey];
							} else {
								console.log(`除外しました：${key}-${subKey}`);
							}
							return acc;
						}, {});
						if (i > 0 && !result[arrayResultKey]) {
							result[arrayResultKey] = JSON.stringify(arrayResultValue);
							return;
						}
						result[arrayResultKey] = JSON.stringify(arrayResultValue);
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

export const forJson = (object: CiNiiResearchResponse) => {
	let result = {};
	Object.keys(object).forEach((key) => {
		const resultKey = keyMapper[key] || key;
		if (resultKey === key) {
			console.log('第一階層の考慮漏れっぽい: ', key);
		}
		if (typeof object[key] === 'object' && object[key] !== null) {
			if (nestKeyMapper.hasOwnProperty(key)) {
				if (Array.isArray(object[key])) {
					result[resultKey] = [];
					object[key].map((elm) => {
						const arrayResultValue = Object.keys(elm).reduce((acc, subKey) => {
							if (nestKeyMapper[key].hasOwnProperty(subKey)) {
								acc[nestKeyMapper[key][subKey]] = elm[subKey];
							} else {
								console.log(`第二階層の考慮漏れっぽい：${key}-${subKey}`);
							}
							return acc;
						}, {});
						result[resultKey].push(arrayResultValue);
					});
				} else {
					const resultValue = Object.keys(object[key]).reduce((acc, subKey) => {
						if (nestKeyMapper[key].hasOwnProperty(subKey)) {
							acc[nestKeyMapper[key][subKey]] = object[key][subKey];
						} else {
							console.log(`第二階層の考慮漏れっぽい：${key}-${subKey}`);
						}
						return acc;
					}, {});
					result[resultKey] = resultValue;
				}
			} else {
				result[resultKey] = object[key];
			}
		} else {
			result[resultKey] = object[key];
		}
	});

	return result;
};
