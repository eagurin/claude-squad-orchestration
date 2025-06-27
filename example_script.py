#!/usr/bin/env python3
"""
Пример Python скрипта для тестирования
"""

def greet(name="World"):
    """Приветствие пользователя"""
    return f"Привет, {name}!"

def calculate_sum(numbers):
    """Вычисление суммы чисел"""
    return sum(numbers)

if __name__ == "__main__":
    print(greet("Тестер"))
    print(f"Сумма [1,2,3,4,5]: {calculate_sum([1,2,3,4,5])}")