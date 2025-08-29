export function getTagValue(list: { [key: string]: any }[], name: string): string {
	for (let i = 0; i < list.length; i++) {
		if (list[i]) {
			if (list[i]!.name === name) {
				return list[i]!.value as string;
			}
		}
	}
	return null;
}

export const shortenAddress = (addr: string) => {
	if (!addr) return "";
	if (addr.length <= 10) return addr;
	return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

export const formatTokenAmount = (n: number, sigFigs = 6) => {
	if (!isFinite(n)) return "—";
	if (n === 0) return "0";
	const str = n.toPrecision(sigFigs);
	return str.replace(/\.0+$/, "").replace(/(\.[1-9]*?)0+$/, "$1");
};
