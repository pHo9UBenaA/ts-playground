import { ignoreKeys } from '../constants/util';
import { DeepPartial, TOrTArray } from '../types/utils';
import { CiNiiResearchResponse } from './cinii_research_response';

// 全体的に雑なので、ちゃんとするなら型を作り込んだりが必要

type ShallowCiNiiResearchResponseCount = {
	[K in keyof CiNiiResearchResponse]: CiNiiResearchResponse[K] extends object
		? // Objectは別の機構でカウントする
		  undefined
		: number;
};

// WIP
type FormattedDeepCiNiiResearchResponsePropertyLiteral =
	| string
	| {
			[key: string]:
				| TOrTArray<string>
				| TOrTArray<{
						[key: string]:
							| TOrTArray<string>
							| TOrTArray<{
									[key: string]: string;
							  }>;
				  }>;
	  };
type FormattedDeepCiNiiResearchResponseProperty<Level extends 1 | 2> = Level extends 1
	? FormattedDeepCiNiiResearchResponsePropertyLiteral[]
	: TOrTArray<FormattedDeepCiNiiResearchResponsePropertyLiteral>;

type FormattedDeepCiNiiResearchResponse = {
	[key: string]: FormattedDeepCiNiiResearchResponseProperty<1>;
};

// WIP
type DeepCountPropertyLiteral =
	| {
			value: string;
			count: number;
	  }
	| {
			[key: string]:
				| TOrTArray<{
						value: string;
						count: number;
				  }>
				| TOrTArray<{
						[key: string]:
							| TOrTArray<{
									value: string;
									count: number;
							  }>
							| TOrTArray<{
									[key: string]: TOrTArray<{
										value: string;
										count: number;
									}>;
							  }>;
				  }>;
	  };
type DeepCountProperty<Level extends 1 | 2> = Level extends 1
	? DeepCountPropertyLiteral[] | { [key: string]: number }
	: TOrTArray<DeepCountPropertyLiteral>;

type DeepCiNiiResearchResponseCount = {
	[key: string]: DeepCountProperty<1>;
};

const countNestedProperty = (
	countObjectProperty: DeepPartial<DeepCountProperty<2>>,
	value: DeepPartial<FormattedDeepCiNiiResearchResponseProperty<2>>
): any => {
	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			if (
				countObjectProperty === undefined ||
				Object.keys(countObjectProperty).length === 0
			) {
				countObjectProperty = // createCountObjectProperty(value[0]);
					typeof value[0] === 'object' && !Array.isArray(value[0]) ? {} : [];
			}

			value.forEach((subValue) => {
				const res = countNestedProperty(countObjectProperty, subValue);
				countObjectProperty = res;
			});

			return countObjectProperty;
		} else {
			Object.entries(value).forEach(([subKey, subValue]) => {
				if (
					countObjectProperty[subKey] === undefined ||
					Object.keys(countObjectProperty[subKey]).length === 0
				) {
					countObjectProperty[subKey] =
						typeof subValue === 'object' && !Array.isArray(subValue) ? {} : [];
				}

				if (!ignoreKeys.includes(subKey)) {
					const res = countNestedProperty(countObjectProperty[subKey], subValue);
					countObjectProperty[subKey] = res;
				} else {
					const res = countNonNestedProperty(
						countObjectProperty[subKey],
						`${subKey}: 詳細にカウントする必要がないためkeyの出現のみカウント`
					);
					countObjectProperty[subKey] = res;
				}
			});
			return countObjectProperty;
		}
	} else if (typeof value === 'string') {
		return countNonNestedProperty(countObjectProperty as [], value);
	} else {
		console.log(`考慮漏れっぽい: ${value}`);
	}
};

const countNonNestedProperty = (
	countObjectProperty: { value: string; count: number }[],
	value: string
): { value: string; count: number }[] => {
	const exists = countObjectProperty.find((ob) => ob.value === value);
	if (exists) {
		exists.count++;
		return countObjectProperty;
	}
	return [...countObjectProperty, { value, count: 1 }];
};

const countProperties = (
	input: FormattedDeepCiNiiResearchResponse
): DeepCiNiiResearchResponseCount => {
	let result: DeepCiNiiResearchResponseCount = {};

	Object.entries(input).forEach(([mainKey, mainValue]) => {
		if (result[mainKey] === undefined) {
			result[mainKey] = [];
		}

		mainValue.forEach((elm) => {
			if (typeof elm === 'object') {
				if (result[mainKey] === undefined || Object.keys(result[mainKey]).length === 0) {
					result[mainKey] = typeof elm === 'object' && !Array.isArray(elm) ? {} : [];
				}

				if (Array.isArray(elm)) {
					console.log(`考慮漏れっぽい: ${elm}`);
				}
				const res = countNestedProperty(result[mainKey], elm);
				result[mainKey] = res;
			} else if (typeof elm === 'string') {
				if (!ignoreKeys.includes(mainKey)) {
					const res = countNonNestedProperty(
						result[mainKey] as { value: string; count: number }[],
						elm
					);
					result[mainKey] = res;
				} else {
					const res = countNonNestedProperty(
						result[mainKey] as { value: string; count: number }[],
						`${mainKey}: 詳細にカウントする必要がないためkeyの出現のみカウント`
					);
					result[mainKey] = res;
				}
			} else {
				console.log(`考慮漏れっぽい: ${elm}`);
			}
		});
	});

	return result;
};

const countAttributes = (
	responses: CiNiiResearchResponse[],
	countObj: ShallowCiNiiResearchResponseCount
): {
	shallowCount: DeepCiNiiResearchResponseCount;
	deepCount: DeepCiNiiResearchResponseCount;
} => {
	let formattedSallowResponse: FormattedDeepCiNiiResearchResponse = {};
	let formattedDeepResponse: FormattedDeepCiNiiResearchResponse = {};

	responses.forEach((response) => {
		Object.keys(response).forEach((key) => {
			if (typeof response[key] === 'object' && response[key] !== null) {
				if (formattedDeepResponse[key] === undefined) {
					formattedDeepResponse[key] = [];
				}
				if (Array.isArray(response[key])) {
					formattedDeepResponse[key].push(...response[key]);
				} else {
					formattedDeepResponse[key].push(response[key]);
				}
			} else if (typeof response[key] === 'string') {
				// if (key === 'publicationStatusCode' || key === 'publicationPeriodicityCode') {
				// 	console.log(`${key}が含まれれる: ${response['@id']}`);
				// }
				if (countObj.hasOwnProperty(key)) {
					if (formattedSallowResponse[key] === undefined) {
						formattedSallowResponse[key] = [];
					}
					formattedSallowResponse[key].push(response[key]);
				} else {
					console.log(`考慮漏れっぽい: ${key}`);
				}
			} else {
				console.log(`考慮漏れっぽい: ${key}`);
			}
		});
	});

	return {
		shallowCount: countProperties(formattedSallowResponse),
		deepCount: countProperties(formattedDeepResponse),
	};
};

export const countCiniiResearchResponses = (
	responses: CiNiiResearchResponse[]
): {
	shallowCount: ShallowCiNiiResearchResponseCount;
	deepCount: DeepCiNiiResearchResponseCount;
} => {
	return countAttributes(responses, {
		// '@context': 0,
		'@id': 0,
		'@type': 0,
		resourceType: 0,
		since: 0,
		until: 0,
		reviewed: 0,
		'dc:language': 0,
		'dcterms:accessRights': 0,
		'ndl:dissertationNumber': 0,
		'ndl:dateGranted': 0,
		'ndl:degreeName': 0,
		'jpcoar:conferenceName': 0,
		'jpcoar:conferencePlace': 0,
		'jpcoar:conferenceSponsor': 0,
		invited: 0,
		'prism:edition': 0,
		printing: 0,
		'dc:date': 0,
		'dc:creator': 0,
		publicationCountryCode: 0,
		'cinii:size': 0,
		'dcterms:extent': 0,
		publicationStatusCode: 0,
		publicationPeriodicityCode: 0,
		publicationRegularityCode: 0,
		serialsTypeCode: 0,
		'datacite:version': 0,
		createdAt: 0,
		modifiedAt: 0,

		/**
		 * CiNii ResearchのJSON-LDのフォーマット仕様には記載がないが「プロジェクト」にて返り値が存在する
		 * @link https://support.nii.ac.jp/ja/cir/r_json#format
		 */
		projectStatus: 0,
		allocationAmount: 0,
	} as const satisfies ShallowCiNiiResearchResponseCount);
};
