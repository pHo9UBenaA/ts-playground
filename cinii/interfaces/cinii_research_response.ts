import { DeepPartial } from '../types/utils';

/**
 * WIP 検証などは行わず取り急ぎ一番深いプロパティはstring型にしている
 * @link https://github.com/pHo9UBenaA/py-playground
 */
export type CiNiiResearchResponse = DeepPartial<{
	'@context': string;
	'@id': string;
	'@type': string;
	projectIdentifier: { '@type': string; '@value': string }[];
	personIdentifier: { '@type': string; '@value': string }[];
	productIdentifier: {
		identifier: { '@type': string; '@value': string };
		extra: { type: string; value: string };
	}[];
	resourceType: string;
	'dc:title': { '@language': string; '@value': string }[];
	'jpcoar:awardTitle': { '@language': string; '@value': string }[];
	'dcterms:alternative': { '@language': string; '@value': string }[];
	'foaf:Person': {
		'foaf:name': { '@language': string; '@value': string }[];
		'foaf:familyName': { '@language': string; '@value': string }[];
		'foaf:givenName': { '@language': string; '@value': string }[];
		'foaf:middleName': { '@language': string; '@value': string }[];
	}[];
	career: {
		institution: {
			institutionIdentifier: { '@type': string; '@value': string }[];
			notation: { '@language': string; '@value': string }[];
		};
		department: {
			departmentIdentifier: { '@type': string; '@value': string }[];
			notation: { '@language': string; '@value': string }[];
		};
		jobTitle: {
			jobTitleIdentifier: { '@type': string; '@value': string }[];
			notation: { '@language': string; '@value': string }[];
		};
		since: string;
		until: string;
	}[];
	field: { keyword: { language: string; textList: string[] }[] }[];
	'dc:language': string;
	description: {
		type: string;
		notation: { '@language': string; '@value': string }[];
		abstractLicenseFlag: { '@value': string };
	}[];
	researcher: {
		'@id': string;
		'@type': string;
		personIdentifier: { '@type': string; '@value': string }[];
		name: { '@language': string; '@value': string }[];
		affiliation: { '@language': string; '@value': string }[];
		role: string;
	}[];
	since: string;
	until: string;
	institution: {
		institutionIdentifier: { '@type': string; '@value': string }[];
		notation: { '@language': string; '@value': string }[];
	}[];
	fundingProgram: { notation: { '@language': string; '@value': string }[] }[];
	creator: {
		'@id': string;
		'@type': string;
		personIdentifier: { '@type': string; '@value': string }[];
		'foaf:name': { '@language': string; '@value': string }[];
		'jpcoar:affiliationName': { '@language': string; '@value': string }[];
		role: string;
	}[];
	contributor: {
		'@id': string;
		'@type': string;
		personIdentifier: { '@type': string; '@value': string }[];
		'foaf:name': { '@language': string; '@value': string }[];
		'jpcoar:affiliationName': { '@language': string; '@value': string }[];
		role: string;
	}[];
	publication: {
		publicationIdentifier: { '@type': string; '@value': string }[];
		'prism:publicationName': { '@language': string; '@value': string }[];
		'dc:publisher': { '@language': string; '@value': string }[];
		'prism:publicationDate': string;
		'prism:volume': string;
		'prism:number': string;
		'prism:startingPage': string;
		'prism:endingPage': string;
		'jpcoar:numPages': string;
		foreign: string;
		jointInternationalResearch: string;
	};
	reviewed: string;
	'dcterms:accessRights': string;
	'ndl:dissertationNumber': string;
	'ndl:dateGranted': string;
	'ndl:degreeName': string;
	degreeAwardInstitution: {
		institutionIdentifier: { '@type': string; '@value': string }[];
		'jpcoar:degreeGrantorName': { '@language': string; '@value': string }[];
	};
	'jpcoar:conferenceName': string;
	'jpcoar:conferencePlace': string;
	'jpcoar:conferenceDate': {
		'jpcoar:startDay': string;
		'jpcoar:startMonth': string;
		'jpcoar:startYear': string;
		'jpcoar:endDay': string;
		'jpcoar:endMonth': string;
		'jpcoar:endYear': string;
	};
	'jpcoar:conferenceSponsor': string;
	invited: string;
	'prism:edition': string;
	printing: string;
	'dc:date': string;
	'dcterms:medium': {
		generalMaterialDesignationCode: string;
		specificMaterialDesignationCode: string;
	};
	'dc:creator': string;
	publicationCountryCode: string;
	'dcterms:publisher': {
		'dc:publisher': string;
		publicationPlace: string;
		'prism:publicationDate': string;
	}[];
	'dc:subject': { '@type': string; '@value': string }[];
	'cinii:size': string;
	'dcterms:extent': string;
	publicationStatusCode: string;
	publicationPeriodicityCode: string;
	publicationRegularityCode: string;
	serialsTypeCode: string;
	'jpcoar:extent': string[];
	format: string[];
	'datacite:version': string;
	'dc:rights': string[];
	url: { notation: { '@language': string; '@value': string }[]; '@id': string }[];
	createdAt: string;
	modifiedAt: string;
	'foaf:topic': { '@id': string; 'dc:title': string }[];
	'dcterms:subject': {
		subjectScheme: string;
		notation: { '@language': string; '@value': string }[];
	};
	'cinii:note': { '@language': string; '@value': string }[];
	project: {
		'@id': string;
		'@type': string;
		projectIdentifier: { '@type': string; '@value': string }[];
		notation: { '@language': string; '@value': string }[];
		role: string;
	}[];
	relatedProject: {
		'@id': string;
		'@type': string;
		projectIdentifier: { '@type': string; '@value': string }[];
		relationType: string;
		notation: { '@language': string; '@value': string }[];
	}[];
	product: {
		'@id': string;
		'@type': string;
		resourceType: string;
		productIdentifier: { '@type': string; '@value': string }[];
		notation: { '@language': string; '@value': string }[];
		relation: { type: string; detail: string }[];
	}[];
	relatedProduct: {
		'@id': string;
		'@type': string;
		productIdentifier: { '@type': string; '@value': string }[];
		resourceType: string;
		relationType: string[];
		'jpcoar:relatedTitle': { '@language': string; '@value': string }[];
	}[];
	dataSourceIdentifier: { '@type': string; '@value': string }[];
	'dcterms:tableOfContents': { language: string; 'dcterms:title': string[] }[];
	grant: {
		grantIdentifier: { '@type': string; '@value': string }[];
		'jpcoar:fundingStream': { '@language': string; '@value': string }[];
	};
	allocationClassification: {
		totalCost: { amount: string; unit: string; currency: string };
		breakdownCost: {
			notation: { '@language': string; '@value': string }[];
			amount: string;
			unit: string;
			currency: string;
		}[];
	}[];

	/**
	 * CiNiiResearchのJSON-LDのフォーマット仕様では「配分額」が「allocationClassification」と記載されていたが、返り値を見る限り「allocationAmount」
	 * @link https://support.nii.ac.jp/ja/cir/r_json#format
	 */
	allocationAmount: string;

	/**
	 * CiNii ResearchのJSON-LDのフォーマット仕様には記載がないが「プロジェクト」にて返り値が存在する
	 * @link https://support.nii.ac.jp/ja/cir/r_json#format
	 */
	projectStatus: string;
}>;
