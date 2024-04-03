const foafPersonKeyMapper = {
	'foaf:name': '表記',
	'foaf:familyName': '姓',
	'foaf:givenName': '名',
	'foaf:middleName': 'ミドルネーム',
};

const careerKeyMapper = {
	institution: '所属機関',
	department: '部局',
	jobTitle: '職名',
	since: '着任日',
	until: '離任日',
};

const fieldKeyMapper = {
	keyword: 'キーワード',
};

const descriptionKeyMapper = {
	type: '概要種別',
	notation: '表記',
	abstractLicenseFlag: '抄録ライセンスフラグ',
};

const researcherKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': '種別',
	personIdentifier: 'CiNiiResearch外部の識別子',
	'foaf:name': '氏名',
	'jpcoar:affiliationName': '所属',
	role: '本研究における役割',
};

const institutionKeyMapper = {
	institutionIdentifier: 'CiNiiResearch外部の識別子',
	notation: '表記',
};

const fundingProgramKeyMapper = {
	'jpcoar:funderName': '表記',
};

const creatorKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	personIdentifier: 'CiNiiResearch外部の識別子',
	'foaf:name': '氏名',
	'jpcoar:affiliationName': '所属',
	role: '本研究における役割',
};

const contributorKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	personIdentifier: 'CiNiiResearch外部の識別子',
	'foaf:name': '氏名',
	'jpcoar:affiliationName': '所属',
	role: '本研究における役割',
};

const publicationKeyMapper = {
	publicationIdentifier: 'CiNiiResearch外部の識別子',
	'prism:publicationName': 'タイトル',
	'dc:publisher': '発行者',
	'prism:publicationDate': '発行日',
	'prism:volume': '巻',
	'prism:number': '号',
	'prism:startingPage': '開始ページ',
	'prism:endingPage': '終了ページ',
	'jpcoar:numPages': '総ページ数',
	foreign: '国際誌の有無',
	jointInternationalResearch: '国際共著の有無',
};

const degreeAwardInstitutionKeyMapper = {
	institutionIdentifier: '研究機関識別子',
	'jpcoar:degreeGrantorName': '表記',
};

// 一旦使わないのでコメントアウト
// const jpcoarConferenceDateKeyMapper = {
// 	'jpcoar:startDay':
// 'jpcoar:startMonth':
// 'jpcoar:startYear':
// 'jpcoar:endDay':
// 'jpcoar:endMonth':
// 'jpcoar:endYear':
// }

const dctermsMediumKeyMapper = {
	generalMaterialDesignationCode: '一般',
	specificMaterialDesignationCode: '特殊',
};

const dctermsPublisherKeyMapper = {
	'dc:publisher': '出版社',
	publicationPlace: '出版地',
	'prism:publicationDate': '出版年月日',
};

const urlKeyMapper = {
	'@id': '外部サービスなどへのリンク',
	notation: '表記',
};

const dctermsSubjectKeyMapper = {
	subjectScheme: '種類コード',
	notation: '表記',
};

const projectKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	projectIdentifier: 'CiNiiResearch外部の識別子',
	role: '本研究における役割',
	notation: '課題表記',
	// 念の為
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const relatedProjectKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	projectIdentifier: 'CiNiiResearch外部の識別子',
	relationType: '本研究との関連',
	// 念の為
	notation: '課題表記',
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const productKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	resourceType: '成果物資源種別',
	productIdentifier: 'CiNiiResearch外部の識別子',
	relation: '成果物との関連種別',
	notation: '成果物表記',
	// 念の為
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const relatedProductKeyMapper = {
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	productIdentifier: 'CiNiiResearch外部の識別子',
	resourceType: '成果物資源種別',
	relationType: 'この成果物との関連性',
	// 念の為
	notation: '成果物表記',
	'jpcoar:relatedTitle': 'タイトル',
	'jpcoar:awardTitle': 'タイトル',
};

const grantKeyMapper = {
	grantIdentifier: 'CiNiiResearch外部の識別子',
	'jpcoar:fundingStream': '表記',
};

const allocationClassificationKeyMapper = {
	notation: '表記',
};

const allocationAmountKeyMapper = {
	totalCost: '合計金額',
	breakdownCost: '経費内訳',
};

export const nestKeyMapper = {
	'foaf:Person': foafPersonKeyMapper,
	career: careerKeyMapper,
	field: fieldKeyMapper,
	description: descriptionKeyMapper,
	researcher: researcherKeyMapper,
	institution: institutionKeyMapper,
	fundingProgram: fundingProgramKeyMapper,
	creator: creatorKeyMapper,
	contributor: contributorKeyMapper,
	publication: publicationKeyMapper,
	degreeAwardInstitution: degreeAwardInstitutionKeyMapper,
	'dcterms:medium': dctermsMediumKeyMapper,
	'dcterms:publisher': dctermsPublisherKeyMapper,
	url: urlKeyMapper,
	'dcterms:subject': dctermsSubjectKeyMapper,
	project: projectKeyMapper,
	relatedProject: relatedProjectKeyMapper,
	product: productKeyMapper,
	relatedProduct: relatedProductKeyMapper,
	grant: grantKeyMapper,
	allocationClassification: allocationClassificationKeyMapper,
	allocationAmount: allocationAmountKeyMapper,
};

export const keyMapper = {
	'@context': 'コンテキスト',
	'@id': 'CiNiiResearchのID',
	'@type': 'データ種別',
	projectIdentifier: 'CiNiiResearch外部の識別子',
	personIdentifier: 'CiNiiResearch外部の識別子',
	productIdentifier: 'CiNiiResearch外部の識別子',
	resourceType: '資源種別',
	'dc:title': 'タイトル',
	'jpcoar:awardTitle': 'タイトル（プロジェクト）',
	'dcterms:alternative': 'その他のタイトル',
	'foaf:Person': '氏名',
	career: '所属',
	field: '審査区分/研究分野',
	'dc:language': '言語',
	description: '概要(抄録)',
	researcher: '研究者',
	since: '開始日',
	until: '終了日',
	institution: '研究機関',
	fundingProgram: '助成機関',
	creator: '著者',
	contributor: '寄与者',
	publication: '掲載誌',
	reviewed: '査読の有無',
	'dcterms:accessRights': 'オープンアクセスの有無',
	'ndl:dissertationNumber': '学位授与番号',
	'ndl:dateGranted': '学位授与年月日',
	'ndl:degreeName': '学位名',
	degreeAwardInstitution: '学位授与機関',
	'jpcoar:conferenceName': '学会または会議名',
	'jpcoar:conferencePlace': '開催地',
	'jpcoar:conferenceDate': '開催機関',
	'jpcoar:conferenceSponsor': '主催者',
	invited: '招待の有無',
	'prism:edition': '版',
	printing: '刷',
	'dc:date': '出版年月日',
	'dcterms:medium': '出版種別コード',
	'dc:creator': '責任表示',
	publicationCountryCode: '出版国コード',
	'dcterms:publisher': '出版情報',
	'dc:subject': '分類',
	'cinii:size': '大きさ、版型',
	'dcterms:extent': 'ページ数',
	publicationStatusCode: '出版状況コード',
	publicationPeriodicityCode: '刊行頻度コード',
	publicationRegularityCode: '定期性コード',
	serialsTypeCode: '逐次刊行物のタイプコード',
	'jpcoar:extent': 'サイズ',
	format: 'フォーマット',
	'datacite:version': 'バージョン',
	'dc:rights': '著作権',
	url: 'URL',
	createdAt: '公開日',
	modifiedAt: '最終更新日',
	'foaf:topic': 'キーワード',
	'dcterms:subject': '件名',
	'cinii:note': '注記',
	project: 'プロジェクト（研究課題）',
	relatedProject: '関連プロジェクト',
	product: '成果物',
	relatedProduct: '関連成果物',
	dataSourceIdentifier: 'データソース識別子',
	'dcterms:tableOfContents': '目次',
	grant: '助成プログラム',
	allocationClassification: '配分区分',
	allocationAmount: '配分額',
	projectStatus: 'プロジェクト状況',
};
