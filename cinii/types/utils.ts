/** プロパティを再帰的にrequiredにする */
export type DeepRequired<T> = {
	[K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : T[K];
};

/** プロパティを再帰的にoptionalにする */
export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type TOrTArray<T> = T | T[];
