
export class PathPattern {
    /**
     * E.g. "/folder/:path/::rest"
    */
    public static parse(pattern: string) {
        if (!pattern.startsWith("/")) { throw new Error(); }

        const parts = pattern.substring(1).split('/');
        const p = parts.map<ParsedPatternSegment>(part => {
            if (part.startsWith('::')) {
                const variableName = part.substring(2);
                return { kind: 'variable', variableName, catchAll: true };
            } else if (part.startsWith(':')) {
                const variableName = part.substring(1);
                return { kind: 'variable', variableName, catchAll: false };
            } else {
                return { kind: 'literal', value: part };
            }
        });

        return new PathPattern(p);
    }

    private constructor(private readonly _segments: ParsedPatternSegment[]) {
    }

    public match(path: string): { [key: string]: string } | undefined {
        if (!path.startsWith('/')) {
            throw new Error();
        }

        const parts = path.substring(1).split('/');

        const params: { [key: string]: string } = {};
        for (const segment of this._segments) {
            if (segment.kind === 'literal') {
                const part = parts.shift()
                if (segment.value !== part) {
                    return undefined;
                }
            } else if (segment.kind == 'variable') {
                if (segment.catchAll) {
                    const partText = parts.join('/');
                    parts.length = 0;
                    const value = decodeURIComponent(partText);
                    params[segment.variableName] = value;
                } else {
                    const part = parts.shift();
                    if (part === undefined) { return undefined; }
                    const value = decodeURIComponent(part);
                    params[segment.variableName] = value;
                }
            } else {
                throw new Error();
            }
        }

        if (parts.length > 0) {
            return undefined;
        }

        return params;
    }

    public build(data: { [key: string]: unknown }): string {
        const parts = this._segments.map(segment => {
            if (segment.kind === 'literal') {
                return segment.value;
            } else {
                const value = data[segment.variableName];
                if (value === undefined) {
                    throw new Error();
                }
                return value;
            }
        });

        return '/' + parts.join('/');
    }
}

type ParsedPatternSegment = {
    kind: 'literal';
    value: string;
} | {
    kind: 'variable';
    variableName: string;
    catchAll: boolean;
}
