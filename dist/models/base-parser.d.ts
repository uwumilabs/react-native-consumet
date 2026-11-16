import BaseProvider from './base-provider';
declare abstract class BaseParser extends BaseProvider {
    abstract search(query: string, ...args: any[]): Promise<unknown>;
}
export default BaseParser;
//# sourceMappingURL=base-parser.d.ts.map