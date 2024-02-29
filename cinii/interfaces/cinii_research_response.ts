import { DeepPartial } from '../types/utils';

/**
 * WIP
 * @link https://github.com/pHo9UBenaA/py-playground
 */
export type CiNiiResearchResponse = DeepPartial<{
	// '@context': unknown;
	'@id': string;
	'@type': unknown;
	projectIdentifier: { '@type': unknown; '@value': unknown }[];
	personIdentifier: { '@type': unknown; '@value': unknown }[];
	productIdentifier: {
		identifier: { '@type': unknown; '@value': unknown };
		extra: { type: unknown; value: unknown };
	}[];
	resourceType: unknown;
	'dc:title': unknown[];
	'jpcoar:awardTitle': { '@language': unknown; '@value': unknown }[];
	'dcterms:alternative': { '@language': unknown; '@value': unknown }[];
	'foaf:Person': {
		'foaf:name': { '@language': unknown; '@value': unknown }[];
		'foaf:familyName': { '@language': unknown; '@value': unknown }[];
		'foaf:givenName': { '@language': unknown; '@value': unknown }[];
		'foaf:middleName': { '@language': unknown; '@value': unknown }[];
	}[];
	career: {
		institution: {
			institutionIdentifier: { '@type': unknown; '@value': unknown }[];
			notation: { '@language': unknown; '@value': unknown }[];
		};
		department: {
			departmentIdentifier: { '@type': unknown; '@value': unknown }[];
			notation: { '@language': unknown; '@value': unknown }[];
		};
		jobTitle: {
			jobTitleIdentifier: { '@type': unknown; '@value': unknown }[];
			notation: { '@language': unknown; '@value': unknown }[];
		};
		since: unknown;
		until: unknown;
	}[];
	field: { keyword: { language: unknown; textList: unknown[] }[] }[];
	'dc:language': unknown;
	description: {
		type: unknown;
		notation: { '@language': unknown; '@value': unknown }[];
		abstractLicenseFlag: { '@value': unknown };
	}[];
	researcher: {
		'@id': string;
		'@type': unknown;
		personIdentifier: { '@type': unknown; '@value': unknown }[];
		name: { '@language': unknown; '@value': unknown }[];
		affiliation: { '@language': unknown; '@value': unknown }[];
		role: unknown;
	}[];
	since: unknown;
	until: unknown;
	institution: {
		institutionIdentifier: { '@type': unknown; '@value': unknown }[];
		notation: { '@language': unknown; '@value': unknown }[];
	}[];
	fundingProgram: { notation: { '@language': unknown; '@value': unknown }[] }[];
	creator: {
		'@id': string;
		'@type': unknown;
		personIdentifier: { '@type': unknown; '@value': unknown }[];
		'foaf:name': { '@language': unknown; '@value': unknown }[];
		'jpcoar:affiliationName': { '@language': unknown; '@value': unknown }[];
		role: unknown;
	}[];
	contributor: {
		'@id': string;
		'@type': unknown;
		personIdentifier: { '@type': unknown; '@value': unknown }[];
		'foaf:name': { '@language': unknown; '@value': unknown }[];
		'jpcoar:affiliationName': { '@language': unknown; '@value': unknown }[];
		role: unknown;
	}[];
	publication: {
		publicationIdentifier: { '@type': unknown; '@value': unknown }[];
		'prism:publicationName': { '@language': unknown; '@value': unknown }[];
		'dc:publisher': { '@language': unknown; '@value': unknown }[];
		'prism:publicationDate': unknown;
		'prism:volume': unknown;
		'prism:number': unknown;
		'prism:startingPage': unknown;
		'prism:endingPage': unknown;
		'jpcoar:numPages': unknown;
		foreign: unknown;
		jointInternationalResearch: unknown;
	};
	reviewed: unknown;
	'dcterms:accessRights': unknown;
	'ndl:dissertationNumber': unknown;
	'ndl:dateGranted': unknown;
	'ndl:degreeName': unknown;
	degreeAwardInstitution: {
		institutionIdentifier: { '@type': unknown; '@value': unknown }[];
		'jpcoar:degreeGrantorName': { '@language': unknown; '@value': unknown }[];
	};
	'jpcoar:conferenceName': unknown;
	'jpcoar:conferencePlace': unknown;
	'jpcoar:conferenceDate': {
		'jpcoar:startDay': unknown;
		'jpcoar:startMonth': unknown;
		'jpcoar:startYear': unknown;
		'jpcoar:endDay': unknown;
		'jpcoar:endMonth': unknown;
		'jpcoar:endYear': unknown;
	};
	'jpcoar:conferenceSponsor': unknown;
	invited: unknown;
	'prism:edition': unknown;
	printing: unknown;
	'dc:date': unknown;
	'dcterms:medium': {
		generalMaterialDesignationCode: unknown;
		specificMaterialDesignationCode: unknown;
	};
	'dc:creator': unknown;
	publicationCountryCode: unknown;
	'dcterms:publisher': {
		'dc:publisher': unknown;
		publicationPlace: unknown;
		'prism:publicationDate': unknown;
	}[];
	'dc:subject': { '@type': unknown; '@value': unknown }[];
	'cinii:size': unknown;
	'dcterms:extent': unknown;
	publicationStatusCode: unknown;
	publicationPeriodicityCode: unknown;
	publicationRegularityCode: unknown;
	serialsTypeCode: unknown;
	'jpcoar:extent': unknown[];
	format: unknown[];
	'datacite:version': unknown;
	'dc:rights': unknown[];
	url: { notation: { '@language': unknown; '@value': unknown }[]; '@id': string }[];
	createdAt: unknown;
	modifiedAt: unknown;
	'foaf:topic': { '@id': string; 'dc:title': unknown[] }[];
	'dcterms:subject': {
		subjectScheme: unknown;
		notation: { '@language': unknown; '@value': unknown }[];
	};
	'cinii:note': { '@language': unknown; '@value': unknown }[];
	project: {
		'@id': string;
		'@type': unknown;
		projectIdentifier: { '@type': unknown; '@value': unknown }[];
		notation: { '@language': unknown; '@value': unknown }[];
		role: unknown;
	}[];
	relatedProject: {
		'@id': string;
		'@type': unknown;
		projectIdentifier: { '@type': unknown; '@value': unknown }[];
		relationType: unknown;
		notation: { '@language': unknown; '@value': unknown }[];
	}[];
	product: {
		'@id': string;
		'@type': unknown;
		resourceType: unknown;
		productIdentifier: { '@type': unknown; '@value': unknown }[];
		notation: { '@language': unknown; '@value': unknown }[];
		relation: { type: unknown; detail: unknown };
	}[];
	relatedProduct: {
		'@id': string;
		'@type': unknown;
		productIdentifier: { '@type': unknown; '@value': unknown }[];
		resourceType: unknown;
		relationType: unknown[];
		'jpcoar:relatedTitle': { '@language': unknown; '@value': unknown }[];
	}[];
	dataSourceIdentifier: { '@type': unknown; '@value': unknown }[];
	'dcterms:tableOfContents': { language: unknown; 'dcterms:title': unknown[] }[];
	grant: {
		grantIdentifier: { '@type': unknown; '@value': unknown }[];
		'jpcoar:fundingStream': { '@language': unknown; '@value': unknown }[];
	};
	allocationClassification: {
		totalCost: { amount: unknown; unit: unknown; currency: unknown };
		breakdownCost: {
			notation: { '@language': unknown; '@value': unknown }[];
			amount: unknown;
			unit: unknown;
			currency: unknown;
		}[];
	}[];

	/**
	 * CiNii ResearchのJSON-LDのフォーマット仕様には記載がないが「プロジェクト」にて返り値が存在する
	 * @link https://support.nii.ac.jp/ja/cir/r_json#format
	 */
	projectStatus: unknown;
	allocationAmount: unknown;
}>;
