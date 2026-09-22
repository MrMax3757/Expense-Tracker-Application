import 'package:daybook/core/money/money.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const format = MoneyFormatter();

  test('indian grouping starts at one lakh', () {
    expect(MoneyFormatter.groupIndian('18420'), '18,420');
    expect(MoneyFormatter.groupIndian('104650'), '1,04,650');
    expect(MoneyFormatter.groupIndian('1234567'), '12,34,567');
    expect(format.format(1842000), '₹18,420');
    expect(format.format(10465000), '₹1,04,650');
    expect(format.format(123456789, sign: MoneySign.none), '₹12,34,567.89');
  });

  test('signs use a real minus', () {
    expect(format.format(35000, sign: MoneySign.minus), '−₹350');
    expect(format.format(2500000, sign: MoneySign.plus), '+₹25,000');
  });

  test('calculator does not save an incomplete expression', () {
    expect(parseExpression('340+80').amountMinor, 42000);
    expect(parseExpression('340+').ok, isFalse);
    expect(parseExpression('10.555').reason, 'decimals');
    expect(parseExpression('0').ok, isFalse);
  });
}
