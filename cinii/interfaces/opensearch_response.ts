export type OpenSearchResponse = {
	/** コンテキスト */
	'@context': Context;
	/** 検索リクエストのURI */
	'@id': string;
	/** 'channel'固定 */
	'@type': string;
	/** 'CiNii Research' + 検索種別 + クエリ + '200 0 json' */
	title: string;
	/** titleと同一 */
	description: string;
	/**
	 * @param @id 検索リクエストのURI
	 */
	link: Link;
	/** 検索日時 */
	'dc:date';
	/** 検索結果総数 */
	'opensearch:totalResults': number;
	/**
	 * 開始番号
	 * @description 検索結果のうち、何軒目のデータから取得しているか
	 */
	'opensearch:startIndex': SVGAnimatedNumberList;
	/** 件数 */
	'opensearch:itemsPerPage': number;
	items: Items[];
};

type Context = {
	'@vocab': string;
	rdf: string;
	rdfs: string;
	dc: string;
	prism: string;
	ndl: string;
	opensearch: string;
	cir: string;
	'@language'?: string;
};

type Link = {
	'@id': string;
};

type Items = {
	/** 詳細ページのURI */
	'@id': string;
	'@type': string;
	/** 著者名、タイトル */
	title: string;
	link: Link;
	'rdfs:seeAlso'?: SeeAlso;
	/** 著者名 */
	'dc:creator'?: string[];
	/** 出版社、学位授与期間めい */
	'dc:publisher'?: string;
	/** データ種別 */
	'dc:type': DcType;
	/* 刊行物名 */
	'prism:publicationName'?: string;
	/** ISSN */
	'prism:issn'?: string;
	/** 巻 */
	'prism:volume'?: string;
	/** 号 */
	'prism:number'?: string;
	/** 開始ページ */
	'prism:startingPage'?: string;
	/** 終了ページ */
	'prism:endingPage'?: string;
	/** ページ */
	'prism:pageRange'?: string;
	/** 出版年月日 */
	'prism:publicationDate'?: string;
	/** 抄録 */
	description?: string;
	/**
	 * 抄録ライセンスフラグ
	 * @returns 0 | 1
	 */
	abstractLicenseFlag?: string;
	/** 識別子 */
	'dc:identifier'?: DcidentifierType[];
	/** キーワード */
	'dc:subject'?: string[];
	/** 取得学位名 */
	'ndl:degreeName'?: string;
	/** 学位授与番号 */
	'ndl:dissertationNumber'?: string;
	/** 出版年月日 */
	'dc:date'?: string;
	'dc:source': DcSource;
};

type SeeAlso = {
	/** JSON=LDのURI */
	'@id': string;
};

// 要確認 'Article' | 'Book' | 'Dissertation' | 'ResearchData' | 'Project';
type DcType = string;

type DcidentifierType = {
	/** タイプ */
	'@type': string;
	/** コード値 */
	'@value': string;
};

type DcSource = {
	/** 本文公開ページのURL */
	'@id': string;
	/** データソースの名称 */
	'@dc:title': string;
};
