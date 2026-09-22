/// Integer minor units. INR uses paise. Never store money as a double.
class Money {
  const Money(this.amountMinor, {this.currency = 'INR'})
      : assert(amountMinor >= 0, 'Amount is unsigned. The transaction type carries the sign.');

  final int amountMinor;
  final String currency;

  static const int inrExponent = 2;

  int get rupees => amountMinor ~/ 100;
  int get paise => amountMinor % 100;
}

enum MoneySign { none, minus, plus }

enum Grouping { indian, international }

class MoneyFormatter {
  const MoneyFormatter({
    this.grouping = Grouping.indian,
    this.symbol = '₹',
    this.showPaise = false,
  });

  final Grouping grouping;
  final String symbol;
  final bool showPaise;

  String format(int amountMinor, {MoneySign sign = MoneySign.none}) {
    final abs = amountMinor.abs();
    final major = abs ~/ 100;
    final minor = abs % 100;
    final digits = grouping == Grouping.indian
        ? groupIndian(major.toString())
        : groupInternational(major.toString());
    final showFraction = showPaise || minor != 0;
    final fraction = showFraction ? '.${minor.toString().padLeft(2, '0')}' : '';
    final body = '$symbol$digits$fraction';
    if (sign == MoneySign.minus || amountMinor < 0) return '−$body';
    if (sign == MoneySign.plus) return '+$body';
    return body;
  }

  static String groupIndian(String digits) {
    if (digits.length <= 3) return digits;
    final last3 = digits.substring(digits.length - 3);
    var rest = digits.substring(0, digits.length - 3);
    final parts = <String>[];
    while (rest.length > 2) {
      parts.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) parts.insert(0, rest);
    return '${parts.join(',')},$last3';
  }

  static String groupInternational(String digits) {
    final out = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      final fromEnd = digits.length - i;
      if (i > 0 && fromEnd % 3 == 0) out.write(',');
      out.write(digits[i]);
    }
    return out.toString();
  }
}

class ExpressionResult {
  const ExpressionResult.ok(this.amountMinor) : reason = null;
  const ExpressionResult.fail(this.reason) : amountMinor = null;

  final int? amountMinor;
  final String? reason;
  bool get ok => amountMinor != null && amountMinor! > 0;
}

/// Evaluates `340+80`. A trailing operator does not save the left-hand number.
ExpressionResult parseExpression(String raw) {
  final text = raw.replaceAll('₹', '').replaceAll(',', '').replaceAll(' ', '');
  if (text.isEmpty) return const ExpressionResult.fail('empty');
  if (!RegExp(r'^[\d.+\-×x*]+$').hasMatch(text)) {
    return const ExpressionResult.fail('chars');
  }
  if (RegExp(r'[+\-×x*]$').hasMatch(text)) {
    return const ExpressionResult.fail('incomplete');
  }
  final parts = text.split(RegExp(r'([+×x*\-])')).where((p) => p.isNotEmpty);
  int? total;
  var op = '+';
  for (final part in parts) {
    if (part == '+' || part == '-' || part == '×' || part == 'x' || part == '*') {
      op = part == 'x' || part == '*' ? '×' : part;
      continue;
    }
    if (!RegExp(r'^\d+(\.\d+)?$').hasMatch(part)) {
      return const ExpressionResult.fail('operand');
    }
    final dot = part.split('.');
    if (dot.length == 2 && dot[1].length > 2) {
      return const ExpressionResult.fail('decimals');
    }
    final minor = (double.parse(part) * 100).round();
    if (total == null) {
      total = op == '-' ? -minor : minor;
    } else if (op == '+') {
      total += minor;
    } else if (op == '-') {
      total -= minor;
    } else {
      total = ((total * minor) / 100).round();
    }
    op = '+';
  }
  if (total == null || total <= 0) return const ExpressionResult.fail('nonpositive');
  return ExpressionResult.ok(total);
}
