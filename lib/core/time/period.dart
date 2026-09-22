class LocalDate {
  const LocalDate(this.year, this.month, this.day);

  final int year;
  final int month;
  final int day;

  factory LocalDate.parse(String iso) {
    final parts = iso.split('-');
    return LocalDate(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
  }

  factory LocalDate.today() {
    final now = DateTime.now();
    return LocalDate(now.year, now.month, now.day);
  }

  String get iso =>
      '$year-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';

  DateTime get asDate => DateTime(year, month, day);

  LocalDate addDays(int days) {
    final next = asDate.add(Duration(days: days));
    return LocalDate(next.year, next.month, next.day);
  }

  LocalDate addMonths(int delta) => LocalDate(year, month + delta, 1);

  int get lengthOfMonth => DateTime(year, month + 1, 0).day;

  int clampDay(int payday) => payday > lengthOfMonth ? lengthOfMonth : payday;

  bool operator >=(LocalDate other) => iso.compareTo(other.iso) >= 0;
  bool operator <=(LocalDate other) => iso.compareTo(other.iso) <= 0;
}

class Period {
  const Period(this.start, this.end);
  final LocalDate start;
  final LocalDate end;
  bool contains(LocalDate date) => date >= start && date <= end;
}

Period periodContaining(LocalDate date, {required String paydayMode, int? paydayDay}) {
  if (paydayMode != 'day' || paydayDay == null) {
    final start = LocalDate(date.year, date.month, 1);
    final next = LocalDate(date.year, date.month + 1, 1);
    return Period(start, next.addDays(-1));
  }
  var startYear = date.year;
  var startMonth = date.month;
  if (date.day < LocalDate(date.year, date.month, 1).letDay(paydayDay)) {
    final prev = DateTime(date.year, date.month - 1, 1);
    startYear = prev.year;
    startMonth = prev.month;
  }
  final startDay = LocalDate(startYear, startMonth, 1).letDay(paydayDay);
  final start = LocalDate(startYear, startMonth, startDay);
  final nextMonth = DateTime(startYear, startMonth + 1, 1);
  final nextStartDay = LocalDate(nextMonth.year, nextMonth.month, 1).letDay(paydayDay);
  final nextStart = LocalDate(nextMonth.year, nextMonth.month, nextStartDay);
  return Period(start, nextStart.addDays(-1));
}

extension on LocalDate {
  int letDay(int payday) => clampDay(payday);
}
