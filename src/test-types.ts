export interface TestCase {
    name: string;
    source: string;
    expect: string;
    fs?: Record<string, string>;
}
