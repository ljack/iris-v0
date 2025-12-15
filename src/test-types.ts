export interface TestCase {
    name: string;
    source: string;
    expect: string;
    fs?: Record<string, string>;
    modules?: Record<string, string>; // path -> source
}
