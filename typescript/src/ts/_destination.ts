/**
 * 文字列の拡張子を削除する関数。
 * 拡張子が含まれていない場合は、引数の文字列をそのまま返す。
 *
 * @param filename 拡張子を削除する対象の文字列
 * @returns 拡張子を削除した文字列、または引数の文字列
 */
const removeExtension = (filename: string): string => {
	const filenameLength = filename.length;
	const longFilename = filenameLength > 20;
	const lastDotIndex = longFilename ? filenameLength - 10 : -1;
	const dotIndex = filename.lastIndexOf('.', lastDotIndex);
	if (dotIndex === -1) {
		return filename;
	}
	return filename.substring(0, dotIndex);
};

window.document.onkeydown = function (event) {
	if (event.key !== 'Enter') {
		return;
	}

	const inputValue = prompt('Please enter the destination.', '');
	if (!inputValue) {
		return;
	}

	const filename = removeExtension(inputValue);
	location.href = `${filename}.html`;
};
