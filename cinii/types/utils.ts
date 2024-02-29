/** 全てのプロパティをrequiredにする */
export type DeepRequired<T> = {
	[K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K];
};

/** 全てのプロパティをoptionalにする */
export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * 全てのプロパティの型をnumberにする
 * 配列の場合、配列内の要素をnumberにする（プリミティブな形の場合はnumber,オブジェクトの場合は再起的にnumberにする）
 */
export type DeepNumber<T> = {
	// [K in keyof T]: T[K] extends object ? DeepNumber<T[K]> : number;
	[K in keyof T]: T[K] extends (infer U)[]
		? DeepNumber<U>
		: T[K] extends object
		? DeepNumber<T[K]>
		: number;
};
