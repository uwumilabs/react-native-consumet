import BaseProvider from './base-provider';

abstract class BaseParser extends BaseProvider {
  abstract search(query: string, ...args: any[]): Promise<unknown>;
}

export default BaseParser;
