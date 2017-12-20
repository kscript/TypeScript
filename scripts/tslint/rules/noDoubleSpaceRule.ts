import * as Lint from "tslint/lib";
import * as ts from "typescript";

export class Rule extends Lint.Rules.AbstractRule {
    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function walk(ctx: Lint.WalkContext<void>): void {
    const { sourceFile } = ctx;
    const lines = sourceFile.text.split("\n");
    const strings = getLiterals(sourceFile);
    lines.forEach((line, idx) => {
        // Skip indentation.
        const firstNonSpace = /\S/.exec(line);
        if (firstNonSpace === null) {
            return;
        }
        // Allow common uses of double spaces
        // * To align `=` or `!=` signs
        // * To alling comments at the end of lines
        // * To indent inside a comment
        // * To use two spaces after a period
        // * To include aligned `->` in a comment
        const rgx =  /[^/*. ]  [^-!/= ]/g;
        rgx.lastIndex = firstNonSpace.index;
        const doubleSpace = rgx.exec(line);
        // Also allow to align comments after `@param`
        // If there are more than 5 double spaces on a line, probably intentional
        if (doubleSpace !== null && !line.includes("@param") && countDoubleSpaces(line) <= 5) {
            const pos = lines.slice(0, idx).reduce((len, line) => len + 1 + line.length, 0) + doubleSpace.index;
            if (!strings.some(s => s.getStart() <= pos && s.end > pos)) {
                ctx.addFailureAt(pos + 1, 2, "Use only one space.");
            }
        }
    });
}

function countDoubleSpaces(line: string): number {
    let count = 0;
    let idx = 0;
    while (true) {
        idx = line.indexOf("  ", idx);
        if (idx === -1) {
            return count;
        }
        // Start searching at the *next* character
        idx++;
        count++;
    }
}

function getLiterals(sourceFile: ts.SourceFile): ReadonlyArray<ts.Node> {
    const out: ts.Node[] = [];
    sourceFile.forEachChild(function cb(node) {
        switch (node.kind) {
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.TemplateHead:
            case ts.SyntaxKind.TemplateMiddle:
            case ts.SyntaxKind.TemplateTail:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            case ts.SyntaxKind.RegularExpressionLiteral:
                out.push(node);
        }
        node.forEachChild(cb);
    });
    return out;
}
