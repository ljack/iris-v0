module.exports = grammar({
  name: 'iris',

  extras: $ => [
    /\s/,
    $.comment
  ],

  rules: {
    source_file: $ => repeat($._form),

    _form: $ => choice(
      $.list,
      $.symbol,
      $.string,
      $.number,
      $.boolean
    ),

    list: $ => seq('(', repeat($._form), ')'),

    symbol: _ => /[a-zA-Z_+\-*\/=<>!?.][a-zA-Z0-9_+\-*\/=<>!?.:]*/,

    number: _ => /-?\d+/,

    boolean: _ => choice('true', 'false'),

    string: $ => seq('"', repeat(choice($.string_content, $.escape_sequence)), '"'),
    string_content: _ => /[^"\\\n]+/,
    escape_sequence: _ => /\\./,

    comment: _ => /;;.*/
  }
});
