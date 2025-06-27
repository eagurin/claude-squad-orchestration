#!/usr/bin/env python3
"""
Mathematical Utilities Module

A professional mathematical utilities library that demonstrates best practices for:
- Comprehensive input validation
- Robust error handling
- Type hints and documentation
- Performance optimization
- Edge case handling
- Statistical calculations
"""

import logging
import math
from typing import Union, List, Optional, Tuple, Dict, Any
from dataclasses import dataclass
from collections.abc import Iterable
from functools import wraps
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type aliases for better readability
Number = Union[int, float]
NumberList = List[Number]


@dataclass
class StatisticalResult:
    """Container for statistical calculation results."""
    
    mean: float
    median: float
    mode: Optional[Number]
    std_dev: float
    variance: float
    min_value: Number
    max_value: Number
    count: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        return {
            'mean': self.mean,
            'median': self.median,
            'mode': self.mode,
            'standard_deviation': self.std_dev,
            'variance': self.variance,
            'minimum': self.min_value,
            'maximum': self.max_value,
            'count': self.count
        }


def validate_numbers(func):
    """Decorator to validate number inputs."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Validate the first argument if it's a list/iterable of numbers
        if args and isinstance(args[0], (list, tuple)):
            numbers = args[0]
            if not numbers:
                raise ValueError("Cannot perform calculation on empty sequence")
            
            for i, num in enumerate(numbers):
                if not isinstance(num, (int, float)):
                    raise TypeError(f"Element at index {i} is not a number: {type(num).__name__}")
                if math.isnan(num):
                    raise ValueError(f"NaN value found at index {i}")
                if math.isinf(num):
                    raise ValueError(f"Infinite value found at index {i}")
        
        return func(*args, **kwargs)
    return wrapper


def performance_monitor(func):
    """Decorator to monitor function performance."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        
        execution_time = end_time - start_time
        if execution_time > 0.1:  # Log if execution takes more than 100ms
            logger.warning(f"{func.__name__} took {execution_time:.4f} seconds to execute")
        else:
            logger.debug(f"{func.__name__} executed in {execution_time:.4f} seconds")
        
        return result
    return wrapper


class MathUtilities:
    """
    Professional mathematical utilities class with comprehensive functionality.
    
    This class provides various mathematical operations with proper error handling,
    input validation, and performance monitoring.
    
    Features:
    - Basic arithmetic operations
    - Statistical calculations
    - Number sequence analysis
    - Performance monitoring
    - Comprehensive error handling
    
    Example:
        >>> math_utils = MathUtilities()
        >>> result = math_utils.calculate_sum([1, 2, 3, 4, 5])
        >>> print(result)
        15
        
        >>> stats = math_utils.calculate_statistics([1, 2, 3, 4, 5])
        >>> print(f"Mean: {stats.mean}, Std Dev: {stats.std_dev}")
        Mean: 3.0, Std Dev: 1.5811388300841898
    """
    
    def __init__(self, precision: int = 10) -> None:
        """
        Initialize the MathUtilities instance.
        
        Args:
            precision: Number of decimal places for rounding results
            
        Raises:
            ValueError: If precision is negative
        """
        if precision < 0:
            raise ValueError("Precision must be non-negative")
        
        self.precision = precision
        logger.info(f"MathUtilities initialized with precision: {precision}")
    
    @validate_numbers
    @performance_monitor
    def calculate_sum(self, numbers: NumberList) -> Number:
        """
        Calculate the sum of a list of numbers.
        
        Args:
            numbers: List of numbers to sum
            
        Returns:
            The sum of all numbers
            
        Raises:
            ValueError: If the list is empty or contains invalid values
            TypeError: If input contains non-numeric values
            OverflowError: If the sum exceeds system limits
            
        Example:
            >>> math_utils = MathUtilities()
            >>> math_utils.calculate_sum([1, 2, 3, 4, 5])
            15
        """
        try:
            result = sum(numbers)
            
            # Check for overflow
            if math.isinf(result):
                raise OverflowError("Sum calculation resulted in overflow")
            
            logger.debug(f"Calculated sum of {len(numbers)} numbers: {result}")
            return round(result, self.precision) if isinstance(result, float) else result
            
        except Exception as e:
            logger.error(f"Error calculating sum: {e}")
            raise
    
    @validate_numbers
    @performance_monitor
    def calculate_mean(self, numbers: NumberList) -> float:
        """
        Calculate the arithmetic mean of a list of numbers.
        
        Args:
            numbers: List of numbers
            
        Returns:
            The arithmetic mean
            
        Raises:
            ValueError: If the list is empty
            TypeError: If input contains non-numeric values
        """
        try:
            mean = sum(numbers) / len(numbers)
            logger.debug(f"Calculated mean of {len(numbers)} numbers: {mean}")
            return round(mean, self.precision)
            
        except ZeroDivisionError:
            raise ValueError("Cannot calculate mean of empty list")
        except Exception as e:
            logger.error(f"Error calculating mean: {e}")
            raise
    
    @validate_numbers
    @performance_monitor
    def calculate_median(self, numbers: NumberList) -> float:
        """
        Calculate the median of a list of numbers.
        
        Args:
            numbers: List of numbers
            
        Returns:
            The median value
            
        Raises:
            ValueError: If the list is empty
            TypeError: If input contains non-numeric values
        """
        try:
            sorted_numbers = sorted(numbers)
            n = len(sorted_numbers)
            
            if n % 2 == 0:
                # Even number of elements
                median = (sorted_numbers[n // 2 - 1] + sorted_numbers[n // 2]) / 2
            else:
                # Odd number of elements
                median = sorted_numbers[n // 2]
            
            logger.debug(f"Calculated median of {len(numbers)} numbers: {median}")
            return round(median, self.precision)
            
        except Exception as e:
            logger.error(f"Error calculating median: {e}")
            raise
    
    @validate_numbers
    @performance_monitor
    def calculate_mode(self, numbers: NumberList) -> Optional[Number]:
        """
        Calculate the mode (most frequent value) of a list of numbers.
        
        Args:
            numbers: List of numbers
            
        Returns:
            The mode value, or None if no mode exists (all values appear equally)
            
        Raises:
            ValueError: If the list is empty
            TypeError: If input contains non-numeric values
        """
        try:
            from collections import Counter
            
            counts = Counter(numbers)
            max_count = max(counts.values())
            
            # Find all values with maximum count
            modes = [num for num, count in counts.items() if count == max_count]
            
            # Return mode only if it's unique and appears more than once
            if len(modes) == 1 and max_count > 1:
                mode = modes[0]
                logger.debug(f"Calculated mode of {len(numbers)} numbers: {mode}")
                return mode
            
            logger.debug(f"No unique mode found for {len(numbers)} numbers")
            return None
            
        except Exception as e:
            logger.error(f"Error calculating mode: {e}")
            raise
    
    @validate_numbers
    @performance_monitor
    def calculate_standard_deviation(self, numbers: NumberList, population: bool = False) -> float:
        """
        Calculate the standard deviation of a list of numbers.
        
        Args:
            numbers: List of numbers
            population: If True, calculate population standard deviation; 
                       if False, calculate sample standard deviation
            
        Returns:
            The standard deviation
            
        Raises:
            ValueError: If the list is empty or has insufficient data
            TypeError: If input contains non-numeric values
        """
        try:
            if len(numbers) < 2 and not population:
                raise ValueError("Sample standard deviation requires at least 2 values")
            
            mean = self.calculate_mean(numbers)
            variance = sum((x - mean) ** 2 for x in numbers)
            
            if population:
                variance /= len(numbers)
            else:
                variance /= (len(numbers) - 1)
            
            std_dev = math.sqrt(variance)
            logger.debug(f"Calculated standard deviation of {len(numbers)} numbers: {std_dev}")
            return round(std_dev, self.precision)
            
        except Exception as e:
            logger.error(f"Error calculating standard deviation: {e}")
            raise
    
    @validate_numbers
    @performance_monitor
    def calculate_statistics(self, numbers: NumberList) -> StatisticalResult:
        """
        Calculate comprehensive statistics for a list of numbers.
        
        Args:
            numbers: List of numbers
            
        Returns:
            StatisticalResult object containing all calculated statistics
            
        Raises:
            ValueError: If the list is empty
            TypeError: If input contains non-numeric values
        """
        try:
            mean = self.calculate_mean(numbers)
            median = self.calculate_median(numbers)
            mode = self.calculate_mode(numbers)
            std_dev = self.calculate_standard_deviation(numbers)
            variance = std_dev ** 2
            min_value = min(numbers)
            max_value = max(numbers)
            count = len(numbers)
            
            result = StatisticalResult(
                mean=mean,
                median=median,
                mode=mode,
                std_dev=std_dev,
                variance=variance,
                min_value=min_value,
                max_value=max_value,
                count=count
            )
            
            logger.info(f"Calculated comprehensive statistics for {count} numbers")
            return result
            
        except Exception as e:
            logger.error(f"Error calculating statistics: {e}")
            raise
    
    def calculate_factorial(self, n: int) -> int:
        """
        Calculate the factorial of a non-negative integer.
        
        Args:
            n: Non-negative integer
            
        Returns:
            The factorial of n
            
        Raises:
            ValueError: If n is negative
            TypeError: If n is not an integer
            OverflowError: If the result is too large
        """
        if not isinstance(n, int):
            raise TypeError(f"Factorial requires an integer, got {type(n).__name__}")
        
        if n < 0:
            raise ValueError("Factorial is not defined for negative numbers")
        
        if n > 1000:  # Prevent extremely large calculations
            raise OverflowError("Factorial calculation would be too large")
        
        try:
            result = math.factorial(n)
            logger.debug(f"Calculated factorial of {n}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error calculating factorial: {e}")
            raise
    
    def is_prime(self, n: int) -> bool:
        """
        Check if a number is prime.
        
        Args:
            n: Integer to check
            
        Returns:
            True if n is prime, False otherwise
            
        Raises:
            TypeError: If n is not an integer
        """
        if not isinstance(n, int):
            raise TypeError(f"Prime check requires an integer, got {type(n).__name__}")
        
        if n < 2:
            return False
        
        if n == 2:
            return True
        
        if n % 2 == 0:
            return False
        
        # Check odd divisors up to sqrt(n)
        for i in range(3, int(math.sqrt(n)) + 1, 2):
            if n % i == 0:
                return False
        
        logger.debug(f"Prime check for {n}: True")
        return True
    
    def generate_fibonacci(self, n: int) -> List[int]:
        """
        Generate the first n numbers in the Fibonacci sequence.
        
        Args:
            n: Number of Fibonacci numbers to generate
            
        Returns:
            List of Fibonacci numbers
            
        Raises:
            ValueError: If n is negative
            TypeError: If n is not an integer
        """
        if not isinstance(n, int):
            raise TypeError(f"Fibonacci generation requires an integer, got {type(n).__name__}")
        
        if n < 0:
            raise ValueError("Cannot generate negative number of Fibonacci numbers")
        
        if n == 0:
            return []
        
        if n == 1:
            return [0]
        
        fibonacci = [0, 1]
        for i in range(2, n):
            fibonacci.append(fibonacci[i-1] + fibonacci[i-2])
        
        logger.debug(f"Generated {n} Fibonacci numbers")
        return fibonacci
    
    def __repr__(self) -> str:
        """Return string representation of the MathUtilities instance."""
        return f"MathUtilities(precision={self.precision})"


def main() -> None:
    """
    Main function demonstrating the mathematical utilities functionality.
    
    This function showcases various features of the MathUtilities class including:
    - Basic sum calculation
    - Comprehensive statistical analysis
    - Prime number checking
    - Fibonacci sequence generation
    - Error handling demonstrations
    """
    print("=== Claude Squad Mathematical Utilities Demo ===\n")
    
    try:
        # Initialize utilities
        math_utils = MathUtilities(precision=4)
        
        # Test data
        test_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        
        print("1. Basic calculations:")
        print(f"   Sum of {test_numbers}: {math_utils.calculate_sum(test_numbers)}")
        print(f"   Mean: {math_utils.calculate_mean(test_numbers)}")
        print(f"   Median: {math_utils.calculate_median(test_numbers)}")
        
        print("\n2. Comprehensive statistics:")
        stats = math_utils.calculate_statistics(test_numbers)
        print(f"   Mean: {stats.mean}")
        print(f"   Median: {stats.median}")
        print(f"   Standard Deviation: {stats.std_dev}")
        print(f"   Min: {stats.min_value}, Max: {stats.max_value}")
        print(f"   Count: {stats.count}")
        
        print("\n3. Special calculations:")
        print(f"   Factorial of 5: {math_utils.calculate_factorial(5)}")
        print(f"   Is 17 prime? {math_utils.is_prime(17)}")
        print(f"   Is 18 prime? {math_utils.is_prime(18)}")
        
        print("\n4. Fibonacci sequence (first 10 numbers):")
        fib_sequence = math_utils.generate_fibonacci(10)
        print(f"   {fib_sequence}")
        
        print("\n5. Error handling demonstration:")
        try:
            math_utils.calculate_sum([])  # Empty list
        except ValueError as e:
            print(f"   Caught expected error: {e}")
        
        try:
            math_utils.calculate_factorial(-1)  # Negative factorial
        except ValueError as e:
            print(f"   Caught expected error: {e}")
        
        try:
            math_utils.is_prime("not a number")  # Invalid type
        except TypeError as e:
            print(f"   Caught expected error: {e}")
        
        print("\n6. Performance test with large dataset:")
        large_dataset = list(range(1, 10001))  # 10,000 numbers
        start_time = time.perf_counter()
        large_sum = math_utils.calculate_sum(large_dataset)
        end_time = time.perf_counter()
        print(f"   Sum of 10,000 numbers: {large_sum}")
        print(f"   Calculation time: {end_time - start_time:.4f} seconds")
        
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        print(f"Error: {e}")


if __name__ == "__main__":
    main()