export type SearchType = 'all' | 'data' | 'articles' | 'books' | 'dissertations' | 'projects';

export type DataSourceType =
	| 'KAKEN'
	| 'JALC'
	| 'IRDB'
	| 'CROSSREF'
	| 'DATACITE'
	| 'CID'
	| 'CIB'
	| 'SSJDA'
	| 'NINJAL'
	| 'IDR'
	| 'DBPEDIA'
	| 'RUDA';

export type ResourceType =
	| 'conference paper'
	| 'data paper'
	| 'departmental bulletin paper'
	| 'editorial'
	| 'journal article'
	| 'newspaper'
	| 'periodical'
	| 'review article'
	| 'software paper'
	| 'article'
	| 'journal_article'
	| 'book'
	| 'Audiovisual'
	| 'Collection'
	| 'Dataset'
	| 'Event'
	| 'Image'
	| 'InteractiveResource'
	| 'Model'
	| 'PhysicalObject'
	| 'Service'
	| 'Software'
	| 'Sound'
	| 'Text'
	| 'Workflow'
	| 'Other'
	| 'journal';

export type SortOrder = 'newest' | 'oldest' | 'relevance' | 'citations';
type SortOrderNumber = 0 | 1 | 4 | 10;

const convertSortOrder = (sortOrder: SortOrder | undefined): SortOrderNumber | undefined => {
	switch (sortOrder) {
		case 'newest': {
			return 0;
		}
		case 'oldest': {
			return 1;
		}
		case 'relevance': {
			return 4;
		}
		case 'citations': {
			return 10;
		}
		default: {
			return undefined;
		}
	}
};

export type FormatType = 'html' | 'rss' | 'atom' | 'json';

type CiNiiResearchQuery = {
	appId: string;

	format: FormatType;

	lang?: 'ja' | 'en';

	sortorder?: SortOrderNumber;

	count?: number;

	start?: number;

	q?: string;

	creator?: string;

	from?: string;

	until?: string;

	datasetFormat?: string;

	hasLinkToFullText?: boolean;

	title?: string;

	isFullTitle?: boolean;

	researcherId?: string;

	affiliation?: string;

	publicationTitle?: string;

	issn?: string;

	volume?: string;

	number?: string;

	pages?: string;

	isbn?: string;

	ncid?: string;

	category?: string;

	description?: string;

	awardInstitution?: string;

	degree?: string;

	awardYear?: string;

	publisher?: string;

	projectId?: string;

	doi?: string;

	dataSourceType?: string;

	languageType?: string;

	resourceType?: string;
};

export type CiNiiResearchQueryOptions = {
	/**
	 * 出力フォーマットの記載言語指定
	 * デフォルトは `ja`
	 */
	lang?: 'ja' | 'en';

	/**
	 * 出力時のソート順。
	 * newest：出版年、学位授与年、研究開始年：新しい順、
	 * oldest：出版年、学位授与年、研究開始年：古い順、
	 * relevance：関連度順(デフォルト)、
	 * citations：被引用件数：多い順(論文のみ)
	 */
	sortOrder?: SortOrder;

	/**
	 * ページ当たり表示件数
	 * デフォルト=**20**、1〜200の自然数。自然数でない、または、0以下は、**20**、201以上は、200。
	 * format=htmlの場合、**1ページあたりの表示件数**を換算。
	 * 1ページあたりの表示件数は、**20**、**50**、**100**、**200**に切り上げ。
	 * 201以上は、**200**
	 */
	count?: number;

	/**
	 * 検索結果一覧の開始番号
	 * 自然数。それ以外は、デフォルト=1。
	 * format=htmlの場合、画面のページ数に換算。
	 * start ÷ (1ページあたりの表示件数)。
	 * あまりがある場合 + 1
	 */
	start?: number;

	/**
	 * フリーワード
	 */
	q?: string;

	/**
	 * 人物名
	 */
	creator?: string;

	/**
	 * 開始年
	 * `YYYY` または `YYYYMM` に変換される。
	 * そのため、指定できるのは年、月のみ。
	 */
	from?: Date;

	/**
	 * 終了年
	 * `YYYY` または `YYYYMM` に変換される。
	 * そのため、指定できるのは年、月のみ。
	 */
	until?: Date;

	/**
	 * 実データの提供フォーマット
	 */
	datasetFormat?: string;

	/**
	 * 本文あり検索
	 * 本文あり検索をしたい場合はtrueを指定してください。
	 */
	hasLinkToFullText?: boolean;

	/**
	 * タイトル・研究課題名
	 */
	title?: string;

	/**
	 * タイトル完全一致
	 * タイトル完全一致検索をしたい場合はtrueを指定してください
	 */
	exactTitleMatch?: boolean;

	/**
	 * 著者ID
	 */
	researcherId?: string;

	/**
	 * 所属機関
	 */
	affiliation?: string;

	/**
	 * 刊行物名
	 */
	publicationTitle?: string;

	/**
	 * ISSN
	 */
	issn?: string;

	/**
	 * 巻
	 */
	volume?: string;

	/**
	 * 号
	 */
	number?: string;

	/**
	 * ページ
	 * `start` と `end` が指定された場合、"開始ページ == start" **OR** "終了ページ == end" として検索します。
	 * 一つの数字のみが指定された場合、開始ページ または 終了ページ がそれに該当するものを検索します
	 */
	pages?:
		| number
		| {
				start: number;
				end: number;
		  };

	/**
	 * ISBN
	 */
	isbn?: string;

	/**
	 * NCID
	 */
	ncid?: string;

	/**
	 * 分類
	 */
	category?: string;

	/**
	 * 注記・抄録
	 */
	description?: string;

	/**
	 * 学位授与大学名
	 */
	awardInstitution?: string;

	/**
	 * 取得学位
	 */
	degree?: string;

	/**
	 * 学位授与年
	 * `YYYY` または `YYYYMM` に変換される。
	 * そのため、指定できるのは年、月のみ。
	 */
	awardYear?: Date;

	/**
	 * 公開者、出版者
	 */
	publisher?: string;

	/**
	 * 研究課題/領域番号
	 */
	projectId?: string;

	/**
	 * DOI
	 */
	doi?: string;

	/**
	 * データソース種別
	 * KAKEN(KAKEN)
	 * JALC(ジャパンリンクセンター)
	 * IRDB(学術機関リポジトリデータベース)
	 * CROSSREF(Crossref)
	 * DATACITE(DataCite)
	 * CID(CiNii Dissertations)
	 * CIB(CiNii Books)
	 * SSJDA(SSJデータアーカイブ)
	 * NINJAL(国立国語研究所)
	 * IDR(情報学研究データリポジトリ)
	 * DBPEDIA(DBpedia)
	 * RUDA(立教大学 社会調査データアーカイブ)
	 */
	dataSourceType?: DataSourceType | DataSourceType[];

	// TODO: ISO-639-1の型をサポートする
	/**
	 * 言語種別
	 * ISO-639-1で指定する
	 * 例)日本語・英語・中国語で検索する場合
	 * languageType=["ja","en","zh"]
	 */
	languageType?: string | string[];

	/**
	 * 資源種別
	 * conference paper(会議発表資料)
	 * data paper(データ論文)
	 * departmental bulletin paper(紀要論文)
	 * editorial(エディトリアル)
	 * journal article(学術雑誌論文)
	 * newspaper(新聞)
	 * periodical(逐次刊行物)
	 * review article(レビュー論文)
	 * software paper(ソフトウェア論文)
	 * article(記事)
	 * journal_article(雑誌論文)
	 * book(図書)
	 * Audiovisual(視聴覚雑誌)
	 * Collection(コレクション)
	 * Dataset(データセット)
	 * Event(イベント)
	 * Image(画像)
	 * InteractiveResource(インタラクティブリソース)
	 * Model(モデル)
	 * PhysicalObject(物理オブジェクト)
	 * Service(サービス)
	 * Software(ソフトウェア)
	 * Sound(音声)
	 * Text(テキスト)
	 * Workflow(ワークフロー)
	 * Other(その他)
	 * journal(雑誌)
	 */
	resourceType?: ResourceType | ResourceType[];
};
