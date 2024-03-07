/** 検索種別 */
export type SearchType = 'all' | 'data' | 'articles' | 'books' | 'dissertations' | 'projects';

/**
 * レスポンスフォーマット
 * @description
 * - 本来は参考URLのように複数指定できるが 'json' しか指定しない想定
 * - 参考URL: https://support.nii.ac.jp/ja/cir/r_opensearch
 */
type FormatType = 'json';

/** 検索結果の言語 */
type ResponseLangType = 'ja' | 'en';

/**
 * 出力時のソート順
 * @description
 *  - 0: 出版年、学位授与年、研究開始年：新しい順
 *  - 1: 出版年、学位授与年、研究開始年：古い順
 *  - 4: 関連度順
 *  - 10: 被引用件数：多い順（論文のみ）
 */
export type SortType = 0 | 1 | 4 | 10;

/**
 * ページ当たり表示件数
 * @default 20
 */
export type CountType = 20 | 50 | 100 | 200;

/**
 * データソース種別
 * @description
 * - KAKEN: KAKEN
 * - JALC: ジャパンリンクセンター
 * - IRDB: 学術機関リポジトリデータベース
 * - CROSSREF: Crossref
 * - DATACITE: DataCite
 * - CID: CiNii Dissertations
 * - CIB: CiNii Books
 * - SSJDA: SSJデータアーカイブ
 * - NINJAL: 国立国語研究所
 * - IDR: 情報学研究データリポジトリ
 * - DBPEDIA: DBpedia
 * - RUDA: 立教大学 社会調査データアーカイブ
 */
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
	| 'RUDA'
	// クエリ仕様に記載はないが以下のデータソースも存在する（網羅できているかは不明）
	| 'CIA'
	| 'KAKEN'
	| 'NDL'
	| 'NDL_DC'
	| 'INTEGBIO'
	| 'PUBMED'
	| 'NIKKEI_BP'
	| 'MDR';

/**
 * 資源種別
 * @description
 * - conference paper: 会議発表資料
 * - data paper: データ論文
 * - departmental bulletin paper: 紀要論文
 * - editorial: エディトリアル
 * - journal article: 学術雑誌論文
 * - newspaper: 新聞
 * - periodical: 逐次刊行物
 * - review article: レビュー論文
 * - software paper: ソフトウェア論文
 * - article: 記事
 * - journal_article: 雑誌論文
 * - book: 図書
 * - Audiovisual: 視聴覚雑誌
 * - Collection: コレクション
 * - Dataset: データセット
 * - Event: イベント
 * - Image: 画像
 * - InteractiveResource: インタラクティブリソース
 * - Model: モデル
 * - PhysicalObject: 物理オブジェクト
 * - Service: サービス
 * - Software: ソフトウェア
 * - Sound: 音声
 * - Text: テキスト
 * - Workflow: ワークフロー
 * - Other: その他
 * - journal: 雑誌
 */
type ResourceType =
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

/**
 * 研究開発事業種別
 * @description
 * - MOONSHOT: ムーンショット型研究開発事業
 */
type RgProgramType = 'MOONSHOT';

export type OpenSearchRequestQuery = {
	/** アプリケーションID */
	appid?: string;

	/**
	 * レスポンスフォーマット
	 * @default html
	 * @description
	 * - 本来は参考URLのように複数指定できるが 'json' しか指定しない想定で、デフォルトと異なるため必須にしている
	 * - 参考URL: https://support.nii.ac.jp/ja/cir/r_opensearch
	 */
	format: FormatType;

	/**
	 * 検索結果の言語
	 * @default ja
	 */
	lang?: ResponseLangType;

	/**
	 * 出力時のソート順
	 * @default 4
	 */
	sortorder?: SortType;

	/** ページ当たり表示件数 */
	count?: CountType;

	/**
	 * 検索結果一覧の開始番号
	 * @default 1
	 */
	start?: number;

	/** フリーワード */
	q?: string;

	/** 人物名 */
	creator?: string;

	/**
	 * 開始年
	 * @description YYYY OR YYYYMM
	 */
	from?: string;

	/**
	 * 終了年
	 * @description YYYY OR YYYYMM
	 */
	until?: string;

	/** 実データの提供フォーマット */
	datasetFormat?: string;

	/**
	 * 本文あり
	 * @description true: 本文あり検索
	 */
	hasLinkToFullText?: boolean;

	/** タイトル研究課題名 */
	title?: string;

	/**
	 * タイトル完全一致
	 * @description true: タイトル完全一致検索
	 */
	isFullTitle?: boolean;

	/** 著者ID */
	researcherId?: string;

	/** 所属機関 */
	affiliation?: string;

	/** 刊行物名 */
	publicationTitle?: string;

	/** ISSN */
	issn?: string;

	/** 巻 */
	volume?: string;

	/** 号 */
	number?: string;

	/**
	 * ページ
	 * @description
	 * - x: 開始ページ = x OR 終了ページ = x
	 * - x-y: 開始ページ = x OR 終了ページ = y
	 */
	pages?: string;

	/** ISBN */
	isbn?: string;

	/** NCID */
	ncid?: string;

	/** 分類 */
	category?: string;

	/** 注記・抄録 */
	description?: string;

	/** 学位授与大学名 */
	awardInstitution?: string;

	/** 取得学位 */
	degree?: string;

	/**
	 * 学位授与年
	 * @description YYYY OR YYYYMM
	 */
	awardYear?: string;

	/** 公開者、出版者 */
	publisher?: string;

	/** 研究課題/領域番号 */
	DOI?: string;

	/**  */
	doi?: string;

	/** データソース種別 */
	// dataSourceType?: DataSourceType | DataSourceType[];
	dataSourceType?: string | string[];

	/** 言語種別 */
	languageType?: string;

	/** 資源種別 */
	resourceType?: ResourceType | ResourceType[];

	/** 研究開発事業種別 */
	rdProgramType?: RgProgramType | RgProgramType[];
};
