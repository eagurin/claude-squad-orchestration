#!/usr/bin/env python3
"""
Comprehensive unit tests for the math utilities module.

This test suite demonstrates best practices for testing mathematical functions including:
- Comprehensive test coverage for all methods
- Edge case testing (empty lists, large numbers, etc.)
- Error condition testing
- Parameterized tests for multiple scenarios
- Performance testing
- Statistical accuracy validation
"""

import pytest
import unittest
from unittest.mock import patch, MagicMock
import math
import sys
import os
import time

# Add the examples directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'examples', 'python'))

from math_utils import (
    MathUtilities,
    StatisticalResult,
    validate_numbers,
    performance_monitor,
    Number,
    NumberList
)


class TestStatisticalResult(unittest.TestCase):
    """Test cases for the StatisticalResult dataclass."""
    
    def test_statistical_result_creation(self):
        """Test creating a StatisticalResult object."""
        result = StatisticalResult(
            mean=5.0,
            median=5.0,
            mode=5,
            std_dev=1.5,
            variance=2.25,
            min_value=1,
            max_value=10,
            count=10
        )
        
        self.assertEqual(result.mean, 5.0)
        self.assertEqual(result.median, 5.0)
        self.assertEqual(result.mode, 5)
        self.assertEqual(result.std_dev, 1.5)
        self.assertEqual(result.variance, 2.25)
        self.assertEqual(result.min_value, 1)
        self.assertEqual(result.max_value, 10)
        self.assertEqual(result.count, 10)
    
    def test_to_dict(self):
        """Test converting StatisticalResult to dictionary."""
        result = StatisticalResult(
            mean=5.0,
            median=5.0,
            mode=5,
            std_dev=1.5,
            variance=2.25,
            min_value=1,
            max_value=10,
            count=10
        )
        
        result_dict = result.to_dict()
        expected_dict = {
            'mean': 5.0,
            'median': 5.0,
            'mode': 5,
            'standard_deviation': 1.5,
            'variance': 2.25,
            'minimum': 1,
            'maximum': 10,
            'count': 10
        }
        
        self.assertEqual(result_dict, expected_dict)


class TestValidateNumbersDecorator(unittest.TestCase):
    """Test cases for the validate_numbers decorator."""
    
    def test_validate_numbers_success(self):
        """Test that valid numbers pass validation."""
        @validate_numbers
        def dummy_function(numbers):
            return sum(numbers)
        
        result = dummy_function([1, 2, 3, 4, 5])
        self.assertEqual(result, 15)
    
    def test_validate_numbers_empty_list(self):
        """Test that empty list raises ValueError."""
        @validate_numbers
        def dummy_function(numbers):
            return sum(numbers)
        
        with self.assertRaises(ValueError) as context:
            dummy_function([])
        
        self.assertIn("Cannot perform calculation on empty sequence", str(context.exception))
    
    def test_validate_numbers_invalid_type(self):
        """Test that non-numeric values raise TypeError."""
        @validate_numbers
        def dummy_function(numbers):
            return sum(numbers)
        
        with self.assertRaises(TypeError) as context:
            dummy_function([1, 2, "three", 4])
        
        self.assertIn("Element at index 2 is not a number", str(context.exception))
    
    def test_validate_numbers_nan(self):
        """Test that NaN values raise ValueError."""
        @validate_numbers
        def dummy_function(numbers):
            return sum(numbers)
        
        with self.assertRaises(ValueError) as context:
            dummy_function([1, 2, float('nan'), 4])
        
        self.assertIn("NaN value found at index 2", str(context.exception))
    
    def test_validate_numbers_infinity(self):
        """Test that infinite values raise ValueError."""
        @validate_numbers
        def dummy_function(numbers):
            return sum(numbers)
        
        with self.assertRaises(ValueError) as context:
            dummy_function([1, 2, float('inf'), 4])
        
        self.assertIn("Infinite value found at index 2", str(context.exception))


class TestPerformanceMonitorDecorator(unittest.TestCase):
    """Test cases for the performance_monitor decorator."""
    
    @patch('examples.python.math_utils.logger')
    def test_performance_monitor_fast_function(self, mock_logger):
        """Test performance monitoring for fast functions."""
        @performance_monitor
        def fast_function():
            return 42
        
        result = fast_function()
        self.assertEqual(result, 42)
        
        # Should log debug message for fast execution
        mock_logger.debug.assert_called()
    
    @patch('examples.python.math_utils.logger')
    def test_performance_monitor_slow_function(self, mock_logger):
        """Test performance monitoring for slow functions."""
        @performance_monitor
        def slow_function():
            time.sleep(0.15)  # Sleep for 150ms
            return 42
        
        result = slow_function()
        self.assertEqual(result, 42)
        
        # Should log warning message for slow execution
        mock_logger.warning.assert_called()


class TestMathUtilities(unittest.TestCase):
    """Comprehensive test cases for the MathUtilities class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.math_utils = MathUtilities()
        self.high_precision = MathUtilities(precision=6)
    
    def test_initialization_default(self):
        """Test MathUtilities initialization with default precision."""
        utils = MathUtilities()
        self.assertEqual(utils.precision, 10)
    
    def test_initialization_custom_precision(self):
        """Test MathUtilities initialization with custom precision."""
        utils = MathUtilities(precision=5)
        self.assertEqual(utils.precision, 5)
    
    def test_initialization_invalid_precision(self):
        """Test that negative precision raises ValueError."""
        with self.assertRaises(ValueError) as context:
            MathUtilities(precision=-1)
        
        self.assertIn("Precision must be non-negative", str(context.exception))
    
    def test_calculate_sum_basic(self):
        """Test basic sum calculation."""
        numbers = [1, 2, 3, 4, 5]
        result = self.math_utils.calculate_sum(numbers)
        self.assertEqual(result, 15)
    
    def test_calculate_sum_floats(self):
        """Test sum calculation with floats."""
        numbers = [1.1, 2.2, 3.3]
        result = self.math_utils.calculate_sum(numbers)
        expected = 6.6
        self.assertAlmostEqual(result, expected, places=10)
    
    def test_calculate_sum_negative_numbers(self):
        """Test sum calculation with negative numbers."""
        numbers = [-1, -2, 3, 4]
        result = self.math_utils.calculate_sum(numbers)
        self.assertEqual(result, 4)
    
    def test_calculate_sum_single_number(self):
        """Test sum calculation with single number."""
        numbers = [42]
        result = self.math_utils.calculate_sum(numbers)
        self.assertEqual(result, 42)
    
    def test_calculate_sum_precision_rounding(self):
        """Test that sum results are properly rounded based on precision."""
        utils = MathUtilities(precision=2)
        numbers = [1.111, 2.222, 3.333]
        result = utils.calculate_sum(numbers)
        expected = 6.67  # Rounded to 2 decimal places
        self.assertEqual(result, expected)
    
    def test_calculate_mean_basic(self):
        """Test basic mean calculation."""
        numbers = [1, 2, 3, 4, 5]
        result = self.math_utils.calculate_mean(numbers)
        self.assertEqual(result, 3.0)
    
    def test_calculate_mean_floats(self):
        """Test mean calculation with floats."""
        numbers = [1.5, 2.5, 3.5]
        result = self.math_utils.calculate_mean(numbers)
        expected = 2.5
        self.assertAlmostEqual(result, expected, places=10)
    
    def test_calculate_mean_single_number(self):
        """Test mean calculation with single number."""
        numbers = [42]
        result = self.math_utils.calculate_mean(numbers)
        self.assertEqual(result, 42.0)
    
    def test_calculate_median_odd_count(self):
        """Test median calculation with odd number of elements."""
        numbers = [1, 3, 2, 5, 4]
        result = self.math_utils.calculate_median(numbers)
        self.assertEqual(result, 3.0)
    
    def test_calculate_median_even_count(self):
        """Test median calculation with even number of elements."""
        numbers = [1, 2, 3, 4]
        result = self.math_utils.calculate_median(numbers)
        self.assertEqual(result, 2.5)
    
    def test_calculate_median_single_number(self):
        """Test median calculation with single number."""
        numbers = [42]
        result = self.math_utils.calculate_median(numbers)
        self.assertEqual(result, 42.0)
    
    def test_calculate_median_duplicates(self):
        """Test median calculation with duplicate values."""
        numbers = [1, 2, 2, 3]
        result = self.math_utils.calculate_median(numbers)
        self.assertEqual(result, 2.0)
    
    def test_calculate_mode_unique_mode(self):
        """Test mode calculation with unique mode."""
        numbers = [1, 2, 2, 3, 4]
        result = self.math_utils.calculate_mode(numbers)
        self.assertEqual(result, 2)
    
    def test_calculate_mode_no_mode(self):
        """Test mode calculation with no mode (all values appear once)."""
        numbers = [1, 2, 3, 4, 5]
        result = self.math_utils.calculate_mode(numbers)
        self.assertIsNone(result)
    
    def test_calculate_mode_multiple_modes(self):
        """Test mode calculation with multiple modes (tie)."""
        numbers = [1, 1, 2, 2, 3]
        result = self.math_utils.calculate_mode(numbers)
        self.assertIsNone(result)  # No unique mode
    
    def test_calculate_mode_single_value_repeated(self):
        """Test mode calculation with single value appearing once."""
        numbers = [5]
        result = self.math_utils.calculate_mode(numbers)
        self.assertIsNone(result)  # Single occurrence doesn't constitute a mode
    
    def test_calculate_standard_deviation_sample(self):
        """Test sample standard deviation calculation."""
        numbers = [2, 4, 4, 4, 5, 5, 7, 9]
        result = self.math_utils.calculate_standard_deviation(numbers, population=False)
        expected = 2.0  # Known result for this dataset
        self.assertAlmostEqual(result, expected, places=1)
    
    def test_calculate_standard_deviation_population(self):
        """Test population standard deviation calculation."""
        numbers = [2, 4, 4, 4, 5, 5, 7, 9]
        result = self.math_utils.calculate_standard_deviation(numbers, population=True)
        expected = 1.871  # Approximate known result
        self.assertAlmostEqual(result, expected, places=2)
    
    def test_calculate_standard_deviation_insufficient_data(self):
        """Test that sample std dev with single value raises ValueError."""
        numbers = [5]
        with self.assertRaises(ValueError) as context:
            self.math_utils.calculate_standard_deviation(numbers, population=False)
        
        self.assertIn("Sample standard deviation requires at least 2 values", str(context.exception))
    
    def test_calculate_standard_deviation_population_single_value(self):
        """Test population std dev with single value."""
        numbers = [5]
        result = self.math_utils.calculate_standard_deviation(numbers, population=True)
        self.assertEqual(result, 0.0)
    
    def test_calculate_statistics_comprehensive(self):
        """Test comprehensive statistics calculation."""
        numbers = [1, 2, 3, 4, 5]
        result = self.math_utils.calculate_statistics(numbers)
        
        self.assertIsInstance(result, StatisticalResult)
        self.assertEqual(result.mean, 3.0)
        self.assertEqual(result.median, 3.0)
        self.assertIsNone(result.mode)  # No repeated values
        self.assertAlmostEqual(result.std_dev, 1.5811, places=3)
        self.assertEqual(result.min_value, 1)
        self.assertEqual(result.max_value, 5)
        self.assertEqual(result.count, 5)
    
    def test_calculate_factorial_basic(self):
        """Test basic factorial calculations."""
        test_cases = [
            (0, 1),
            (1, 1),
            (5, 120),
            (10, 3628800)
        ]
        
        for n, expected in test_cases:
            result = self.math_utils.calculate_factorial(n)
            self.assertEqual(result, expected)
    
    def test_calculate_factorial_negative_number(self):
        """Test that negative factorial raises ValueError."""
        with self.assertRaises(ValueError) as context:
            self.math_utils.calculate_factorial(-1)
        
        self.assertIn("Factorial is not defined for negative numbers", str(context.exception))
    
    def test_calculate_factorial_non_integer(self):
        """Test that non-integer factorial raises TypeError."""
        with self.assertRaises(TypeError) as context:
            self.math_utils.calculate_factorial(5.5)
        
        self.assertIn("Factorial requires an integer", str(context.exception))
    
    def test_calculate_factorial_too_large(self):
        """Test that very large factorial raises OverflowError."""
        with self.assertRaises(OverflowError) as context:
            self.math_utils.calculate_factorial(1001)
        
        self.assertIn("Factorial calculation would be too large", str(context.exception))
    
    def test_is_prime_basic(self):
        """Test basic prime number checking."""
        prime_test_cases = [
            (2, True),
            (3, True),
            (5, True),
            (7, True),
            (11, True),
            (13, True),
            (17, True),
            (19, True),
            (23, True)
        ]
        
        for n, expected in prime_test_cases:
            result = self.math_utils.is_prime(n)
            self.assertEqual(result, expected, f"Failed for {n}")
    
    def test_is_prime_non_prime(self):
        """Test non-prime number checking."""
        non_prime_test_cases = [
            (0, False),
            (1, False),
            (4, False),
            (6, False),
            (8, False),
            (9, False),
            (10, False),
            (12, False),
            (15, False),
            (21, False),
            (25, False)
        ]
        
        for n, expected in non_prime_test_cases:
            result = self.math_utils.is_prime(n)
            self.assertEqual(result, expected, f"Failed for {n}")
    
    def test_is_prime_large_prime(self):
        """Test large prime numbers."""
        large_primes = [97, 101, 103, 107, 109, 113, 127, 131, 137, 139]
        
        for prime in large_primes:
            result = self.math_utils.is_prime(prime)
            self.assertTrue(result, f"Failed to identify {prime} as prime")
    
    def test_is_prime_non_integer(self):
        """Test that non-integer input raises TypeError."""
        with self.assertRaises(TypeError) as context:
            self.math_utils.is_prime(5.5)
        
        self.assertIn("Prime check requires an integer", str(context.exception))
    
    def test_generate_fibonacci_basic(self):
        """Test basic Fibonacci sequence generation."""
        test_cases = [
            (0, []),
            (1, [0]),
            (2, [0, 1]),
            (5, [0, 1, 1, 2, 3]),
            (10, [0, 1, 1, 2, 3, 5, 8, 13, 21, 34])
        ]
        
        for n, expected in test_cases:
            result = self.math_utils.generate_fibonacci(n)
            self.assertEqual(result, expected, f"Failed for n={n}")
    
    def test_generate_fibonacci_negative(self):
        """Test that negative count raises ValueError."""
        with self.assertRaises(ValueError) as context:
            self.math_utils.generate_fibonacci(-1)
        
        self.assertIn("Cannot generate negative number of Fibonacci numbers", str(context.exception))
    
    def test_generate_fibonacci_non_integer(self):
        """Test that non-integer count raises TypeError."""
        with self.assertRaises(TypeError) as context:
            self.math_utils.generate_fibonacci(5.5)
        
        self.assertIn("Fibonacci generation requires an integer", str(context.exception))
    
    def test_repr(self):
        """Test string representation of MathUtilities."""
        utils = MathUtilities(precision=5)
        expected = "MathUtilities(precision=5)"
        self.assertEqual(repr(utils), expected)


class TestMathUtilitiesErrorHandling(unittest.TestCase):
    """Test error handling scenarios for MathUtilities."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.math_utils = MathUtilities()
    
    def test_empty_list_errors(self):
        """Test that empty lists raise appropriate errors."""
        methods_to_test = [
            'calculate_sum',
            'calculate_mean',
            'calculate_median',
            'calculate_mode',
            'calculate_standard_deviation',
            'calculate_statistics'
        ]
        
        for method_name in methods_to_test:
            method = getattr(self.math_utils, method_name)
            with self.assertRaises(ValueError):
                method([])
    
    def test_invalid_input_types(self):
        """Test that invalid input types raise TypeError."""
        invalid_inputs = ["not a list", 123, None, True]
        
        for invalid_input in invalid_inputs:
            with self.assertRaises((TypeError, ValueError)):
                self.math_utils.calculate_sum(invalid_input)
    
    def test_mixed_valid_invalid_numbers(self):
        """Test lists with mix of valid and invalid numbers."""
        invalid_lists = [
            [1, 2, "three"],
            [1, None, 3],
            [1, 2, [3]],
            [1, 2, {"three": 3}]
        ]
        
        for invalid_list in invalid_lists:
            with self.assertRaises(TypeError):
                self.math_utils.calculate_sum(invalid_list)


class TestMathUtilitiesPerformance(unittest.TestCase):
    """Performance tests for MathUtilities."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.math_utils = MathUtilities()
    
    def test_large_dataset_performance(self):
        """Test performance with large datasets."""
        large_dataset = list(range(1, 10001))  # 10,000 numbers
        
        # Test that calculations complete in reasonable time
        start_time = time.perf_counter()
        
        sum_result = self.math_utils.calculate_sum(large_dataset)
        mean_result = self.math_utils.calculate_mean(large_dataset)
        median_result = self.math_utils.calculate_median(large_dataset)
        
        end_time = time.perf_counter()
        
        # All calculations should complete in less than 1 second
        self.assertLess(end_time - start_time, 1.0)
        
        # Verify results are correct
        self.assertEqual(sum_result, 50005000)  # Sum of 1 to 10000
        self.assertEqual(mean_result, 5000.5)   # Mean of 1 to 10000
        self.assertEqual(median_result, 5000.5) # Median of 1 to 10000
    
    def test_fibonacci_performance(self):
        """Test Fibonacci generation performance."""
        start_time = time.perf_counter()
        
        # Generate first 1000 Fibonacci numbers
        result = self.math_utils.generate_fibonacci(1000)
        
        end_time = time.perf_counter()
        
        # Should complete in less than 0.1 seconds
        self.assertLess(end_time - start_time, 0.1)
        
        # Verify result is correct length
        self.assertEqual(len(result), 1000)
        
        # Verify first few numbers are correct
        self.assertEqual(result[:5], [0, 1, 1, 2, 3])


class TestMathUtilitiesIntegration(unittest.TestCase):
    """Integration tests for MathUtilities."""
    
    def test_statistical_analysis_workflow(self):
        """Test complete statistical analysis workflow."""
        # Sample dataset
        dataset = [1, 2, 2, 3, 4, 4, 4, 5, 6, 7, 8, 9, 10]
        
        math_utils = MathUtilities(precision=4)
        
        # Calculate comprehensive statistics
        stats = math_utils.calculate_statistics(dataset)
        
        # Verify all statistics are reasonable
        self.assertGreater(stats.mean, 0)
        self.assertGreater(stats.median, 0)
        self.assertEqual(stats.mode, 4)  # 4 appears most frequently
        self.assertGreater(stats.std_dev, 0)
        self.assertGreater(stats.variance, 0)
        self.assertEqual(stats.min_value, 1)
        self.assertEqual(stats.max_value, 10)
        self.assertEqual(stats.count, 13)
        
        # Test conversion to dictionary
        stats_dict = stats.to_dict()
        self.assertIn('mean', stats_dict)
        self.assertIn('median', stats_dict)
        self.assertIn('mode', stats_dict)
    
    def test_mathematical_properties(self):
        """Test mathematical properties and relationships."""
        dataset = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        math_utils = MathUtilities()
        
        # Test that variance is square of standard deviation
        std_dev = math_utils.calculate_standard_deviation(dataset)
        stats = math_utils.calculate_statistics(dataset)
        
        expected_variance = std_dev ** 2
        self.assertAlmostEqual(stats.variance, expected_variance, places=8)
        
        # Test that mean equals sum divided by count
        sum_result = math_utils.calculate_sum(dataset)
        mean_result = math_utils.calculate_mean(dataset)
        expected_mean = sum_result / len(dataset)
        
        self.assertAlmostEqual(mean_result, expected_mean, places=10)


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)