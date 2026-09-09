CREATE DATABASE  IF NOT EXISTS `legal_dms` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `legal_dms`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: legal_dms
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `document_id` int DEFAULT NULL,
  `case_id` int DEFAULT NULL,
  `officer_id` int DEFAULT NULL,
  `action_type` varchar(50) NOT NULL,
  `action_detail` varchar(255) DEFAULT NULL,
  `action_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `document_id` (`document_id`),
  KEY `case_id` (`case_id`),
  KEY `officer_id` (`officer_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`),
  CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `audit_logs_ibfk_3` FOREIGN KEY (`officer_id`) REFERENCES `officers` (`officer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cases`
--

DROP TABLE IF EXISTS `cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cases` (
  `case_id` int NOT NULL AUTO_INCREMENT,
  `officer_id` int NOT NULL,
  `case_number` varchar(50) NOT NULL,
  `subject_name` varchar(150) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `status` enum('OPEN','UNDER_REVIEW','CLEARED','FLAGGED','REJECTED') DEFAULT 'OPEN',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`case_id`),
  UNIQUE KEY `case_number` (`case_number`),
  KEY `officer_id` (`officer_id`),
  CONSTRAINT `cases_ibfk_1` FOREIGN KEY (`officer_id`) REFERENCES `officers` (`officer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cases`
--

LOCK TABLES `cases` WRITE;
/*!40000 ALTER TABLE `cases` DISABLE KEYS */;
/*!40000 ALTER TABLE `cases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_extractions`
--

DROP TABLE IF EXISTS `document_extractions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_extractions` (
  `extraction_id` bigint NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `extracted_data` json NOT NULL,
  `ocr_confidence` decimal(5,4) DEFAULT NULL,
  `extraction_status` enum('PENDING','PROCESSING','COMPLETED','FAILED') DEFAULT 'PENDING',
  `extracted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`extraction_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `document_extractions_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_extractions`
--

LOCK TABLES `document_extractions` WRITE;
/*!40000 ALTER TABLE `document_extractions` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_extractions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `document_type` enum('PASSPORT','VISA','NATIONAL_ID','DRIVING_LICENSE','PERMIT') NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_hash` varchar(255) DEFAULT NULL,
  `upload_status` enum('UPLOADED','PROCESSING','PROCESSED','FAILED') DEFAULT 'UPLOADED',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  KEY `case_id` (`case_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driving_licenses`
--

DROP TABLE IF EXISTS `driving_licenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driving_licenses` (
  `license_id` int NOT NULL AUTO_INCREMENT,
  `license_number` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `date_of_issue` date DEFAULT NULL,
  `date_of_expiry` date DEFAULT NULL,
  `license_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`license_id`),
  UNIQUE KEY `license_number` (`license_number`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driving_licenses`
--

LOCK TABLES `driving_licenses` WRITE;
/*!40000 ALTER TABLE `driving_licenses` DISABLE KEYS */;
INSERT INTO `driving_licenses` VALUES (1,'DL0420180012345','Sanjay Mudgal','2001-04-15','2021-06-10','2041-06-09','LMV'),(2,'UP1420190078562','Rakesh Yadav','1995-11-08','2020-03-15','2040-03-14','MCWG'),(3,'MH0520170034218','Anand Veer','1998-11-25','2019-09-22','2039-09-21','LMV'),(4,'HR0820200067194','Pooja Verma','1999-05-19','2021-01-18','2041-01-17','MCWG'),(5,'RJ0320180098451','Nitin Gupta','2001-01-30','2022-04-05','2042-04-04','LMV'),(6,'KA0720160043279','Aisha Khan','1997-07-16','2018-11-12','2038-11-11','MCWG'),(7,'GJ1020210085637','Deepak Patel','1996-12-04','2022-08-20','2042-08-19','LMV'),(8,'TN0120190027486','Divya Nair','2002-02-21','2023-02-14','2043-02-13','MCWOG'),(9,'MP0620150053912','Suresh Kumar','1994-09-27','2016-07-08','2036-07-07','LMV'),(10,'PB0920200076143','Harpreet Singh','1998-10-13','2021-10-25','2041-10-24','HMV');
/*!40000 ALTER TABLE `driving_licenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `face_verification`
--

DROP TABLE IF EXISTS `face_verification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `face_verification` (
  `verification_id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `face_match_status` enum('MATCH','NO_MATCH','REVIEW') DEFAULT NULL,
  `similarity_score` decimal(5,4) DEFAULT NULL,
  `details` text,
  `verified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`verification_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `face_verification_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `face_verification`
--

LOCK TABLES `face_verification` WRITE;
/*!40000 ALTER TABLE `face_verification` DISABLE KEYS */;
/*!40000 ALTER TABLE `face_verification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `national_ids`
--

DROP TABLE IF EXISTS `national_ids`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `national_ids` (
  `national_id` int NOT NULL AUTO_INCREMENT,
  `id_number` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`national_id`),
  UNIQUE KEY `id_number` (`id_number`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `national_ids`
--

LOCK TABLES `national_ids` WRITE;
/*!40000 ALTER TABLE `national_ids` DISABLE KEYS */;
INSERT INTO `national_ids` VALUES (1,'458721936104','Sanjay Mudgal','IND','2001-04-15','M'),(2,'713604825193','Meera Kumari','IND','2000-02-11','F'),(3,'286491753820','Anand Veer','IND','1998-11-25','M'),(4,'934167208541','Kavita Joshi','IND','1997-06-18','F'),(5,'521803964217','Manish Tiwari','IND','1995-10-09','M'),(6,'867295143608','Ritu Sharma','IND','2002-01-27','F'),(7,'342718605924','Vivek Chauhan','IND','1999-12-14','M'),(8,'695431827052','Nisha Kapoor','IND','2001-09-03','F'),(9,'174826395701','Rajeev Malhotra','IND','1994-05-22','M'),(10,'803517264918','Shalini Verma','IND','1998-08-11','F');
/*!40000 ALTER TABLE `national_ids` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `officers`
--

DROP TABLE IF EXISTS `officers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `officers` (
  `officer_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `badge_number` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`officer_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `badge_number` (`badge_number`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `officers`
--

LOCK TABLES `officers` WRITE;
/*!40000 ALTER TABLE `officers` DISABLE KEYS */;
INSERT INTO `officers` VALUES (1,'Rajesh Kumar','rajesh.kumar@gov.in','$2b$12$qkN2HFbef/UugHF22.jnmOexD7lwRg97pouF3OjBKGGdH65SU2YIu','DL001','Legal Affairs','Senior Officer','ACTIVE','2026-09-01 18:46:36'),(2,'Anita Sharma','anita.sharma@gov.in','$2b$12$km5/bJk6bO4UUYlCodJQGOjiUmzIxSjdElAY4qLQIv2XszWM8GiC.','DL002','Legal Affairs','Officer','ACTIVE','2026-09-01 18:46:36'),(3,'Vikram Singh','vikram.singh@gov.in','$2b$12$ql1i2RrHgxpWIyNuMZJ/g.SE9J6TDOicOmjYbLOFH/XgCdKWHKoqK','DL003','Document Verification','Senior Officer','ACTIVE','2026-09-01 18:46:36'),(4,'Neha Verma','neha.verma@gov.in','$2b$12$yksjKyVwIoMs.hIGskJKoO3Ee5th.X3ROecf7z2x2e/PksKuPSVuu','DL004','Document Verification','Officer','ACTIVE','2026-09-01 18:46:36'),(5,'Amit Patel','amit.patel@gov.in','$2b$12$lFbWW7A9g2ICqPHbP2xnFOAtB4L0un1lvcZyMw.2uLmbdzA7Yq0Ua','DL005','Immigration','Officer','ACTIVE','2026-09-01 18:46:36'),(6,'Priya Nair','priya.nair@gov.in','$2b$12$bZcT6zPHRohjzHJ7mH5UPeb3nVxrPv7IfkWWvrl8bQnBNgQ/mTV/u','DL006','Immigration','Senior Officer','ACTIVE','2026-09-01 18:46:36'),(7,'Sanjay Mehta','sanjay.mehta@gov.in','$2b$12$6jAbZnikL5bxGYE1zVRsYuqlClwFSLC4UaFqYzkyI9uuaYZAIawgS','DL007','Legal Affairs','Officer','ACTIVE','2026-09-01 18:46:36'),(8,'Pooja Yadav','pooja.yadav@gov.in','$2b$12$ue1TLt/zs2I/7RDlQQjJ/./BTSOW7kxLY2qkHYNxHfid7uMyDeUAu','DL008','Document Verification','Officer','ACTIVE','2026-09-01 18:46:36'),(9,'Arun Das','arun.das@gov.in','$2b$12$.09u9CS2.PhfDJoV5k0dPOKOnlo6pBIFOsDFtS3oAsPwUR5qdhvgy','DL009','Immigration','Officer','ACTIVE','2026-09-01 18:46:36'),(10,'Kavita Joshi','kavita.joshi@gov.in','$2b$12$5mWPKh/gtv9SA8Mw35kW8OtlQF3DEmsVmhO5whpdg2yw8RXBx/qde','DL010','Legal Affairs','Senior Officer','ACTIVE','2026-09-01 18:46:36');
/*!40000 ALTER TABLE `officers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `passports`
--

DROP TABLE IF EXISTS `passports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `passports` (
  `passport_id` int NOT NULL AUTO_INCREMENT,
  `passport_number` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `nationality` varchar(100) NOT NULL,
  `date_of_birth` date NOT NULL,
  `date_of_expiry` date NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `document_status` enum('ACTIVE','EXPIRED','BLACKLISTED') DEFAULT 'ACTIVE',
  PRIMARY KEY (`passport_id`),
  UNIQUE KEY `passport_number` (`passport_number`),
  UNIQUE KEY `passport_number_2` (`passport_number`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `passports`
--

LOCK TABLES `passports` WRITE;
/*!40000 ALTER TABLE `passports` DISABLE KEYS */;
INSERT INTO `passports` VALUES (1,'A1234567','Sanjay Mudgal','IND','2001-04-15','2031-04-14','M','ACTIVE'),(2,'AB123456','Sunil Sharma','IND','1999-08-20','2029-08-19','M','ACTIVE'),(3,'K8392041','Meera Kumari','IND','2000-02-11','2030-02-10','F','BLACKLISTED'),(4,'KP839204','Anand Veer','IND','1998-11-25','2032-11-24','M','ACTIVE'),(5,'M5729183','Sneha Gupta','IND','2002-06-10','2032-06-09','F','ACTIVE'),(6,'MR572918','Arjun Patel','IND','1997-03-18','2027-03-17','M','ACTIVE'),(7,'R1047265','Ananya Rao','IND','2001-12-05','2026-12-04','F','ACTIVE'),(8,'RT104726','Rakesh','IND','2003-01-22','2033-01-21','M','ACTIVE'),(9,'H9146253','Meera Joshi','IND','1996-09-14','2025-09-13','F','EXPIRED'),(10,'XY357208','Vikram Singh','IND','2000-07-30','2030-07-29','M','ACTIVE'),(11,'AG022535','Virat Kataria','IND','2007-02-07','2035-08-24','F','ACTIVE');
/*!40000 ALTER TABLE `passports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permits`
--

DROP TABLE IF EXISTS `permits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permits` (
  `permit_id` int NOT NULL AUTO_INCREMENT,
  `permit_number` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `permit_type` varchar(100) DEFAULT NULL,
  `date_of_issue` date DEFAULT NULL,
  `date_of_expiry` date DEFAULT NULL,
  `issuing_authority` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`permit_id`),
  UNIQUE KEY `permit_number` (`permit_number`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permits`
--

LOCK TABLES `permits` WRITE;
/*!40000 ALTER TABLE `permits` DISABLE KEYS */;
INSERT INTO `permits` VALUES (1,'PRM-DL-582941','Sanjay Mudgal','ENTRY','2025-04-10','2026-04-10','Delhi Border Authority'),(2,'PRM-UP-731628','Anand Veer','TRAVEL','2025-07-15','2026-07-15','Uttar Pradesh Authority'),(3,'PRM-MH-496215','Kavita Joshi','WORK','2026-01-20','2027-01-20','Maharashtra Authority'),(4,'PRM-RJ-824573','Vivek Chauhan','ENTRY','2025-09-05','2026-09-05','Rajasthan Authority'),(5,'PRM-HR-317649','Manish Tiwari','TRAVEL','2025-11-12','2026-11-12','Haryana Authority'),(6,'PRM-KA-685214','Ritu Sharma','WORK','2026-02-18','2027-02-18','Karnataka Authority'),(7,'PRM-GJ-953172','Nisha Kapoor','ENTRY','2025-05-22','2026-05-22','Gujarat Authority'),(8,'PRM-TN-428761','Rajeev Malhotra','TRAVEL','2025-08-30','2026-08-30','Tamil Nadu Authority');
/*!40000 ALTER TABLE `permits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `screening_results`
--

DROP TABLE IF EXISTS `screening_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `screening_results` (
  `screening_id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `risk_score` decimal(5,2) NOT NULL,
  `decision` enum('CLEAR','REVIEW','HIGH_RISK') NOT NULL,
  `summary` text,
  `screened_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`screening_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `screening_results_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `screening_results`
--

LOCK TABLES `screening_results` WRITE;
/*!40000 ALTER TABLE `screening_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `screening_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tampering_results`
--

DROP TABLE IF EXISTS `tampering_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tampering_results` (
  `tampering_id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `photo_tampering_status` enum('PASS','SUSPICIOUS','FAIL') DEFAULT NULL,
  `text_tampering_status` enum('PASS','SUSPICIOUS','FAIL') DEFAULT NULL,
  `stamp_tampering_status` enum('PASS','SUSPICIOUS','FAIL') DEFAULT NULL,
  `metadata_status` enum('PASS','SUSPICIOUS','FAIL') DEFAULT NULL,
  `photo_tampering_score` decimal(5,4) DEFAULT NULL,
  `text_tampering_score` decimal(5,4) DEFAULT NULL,
  `stamp_tampering_score` decimal(5,4) DEFAULT NULL,
  `metadata_score` decimal(5,4) DEFAULT NULL,
  `overall_score` decimal(5,4) DEFAULT NULL,
  `overall_status` enum('PASS','SUSPICIOUS','FAIL') DEFAULT NULL,
  `details` text,
  `checked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tampering_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `tampering_results_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tampering_results`
--

LOCK TABLES `tampering_results` WRITE;
/*!40000 ALTER TABLE `tampering_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `tampering_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `validation_results`
--

DROP TABLE IF EXISTS `validation_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `validation_results` (
  `validation_id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `format_status` enum('PASS','FAIL','REVIEW') DEFAULT NULL,
  `database_status` enum('MATCH','MISMATCH','NOT_AVAILABLE','REVIEW') DEFAULT NULL,
  `validation_status` enum('VALID','INVALID','REVIEW') DEFAULT NULL,
  `validation_message` text,
  `checked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`validation_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `validation_results_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `validation_results`
--

LOCK TABLES `validation_results` WRITE;
/*!40000 ALTER TABLE `validation_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `validation_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visas`
--

DROP TABLE IF EXISTS `visas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visas` (
  `visa_id` int NOT NULL AUTO_INCREMENT,
  `visa_number` varchar(50) NOT NULL,
  `passport_number` varchar(50) DEFAULT NULL,
  `visa_type` varchar(100) DEFAULT NULL,
  `entries` varchar(100) DEFAULT NULL,
  `stay_duration` int DEFAULT NULL,
  `document_status` enum('ACTIVE','EXPIRED','BLACKLISTED') DEFAULT 'ACTIVE',
  PRIMARY KEY (`visa_id`),
  UNIQUE KEY `visa_number` (`visa_number`),
  KEY `fk_visa_passport` (`passport_number`),
  CONSTRAINT `fk_visa_passport` FOREIGN KEY (`passport_number`) REFERENCES `passports` (`passport_number`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visas`
--

LOCK TABLES `visas` WRITE;
/*!40000 ALTER TABLE `visas` DISABLE KEYS */;
INSERT INTO `visas` VALUES (1,'IN7K4P92X','A1234567','TOURIST','M',90,'ACTIVE'),(2,'IN3R8T51M','K8392041','TOURIST','S',30,'BLACKLISTED'),(3,'IN9Q2L67B','KP839204','WORK','M',365,'ACTIVE'),(4,'IN5W8C34N','M5729183','STUDENT','M',365,'ACTIVE'),(5,'IN2H6V91Q','MR572918','BUSINESS','S',60,'ACTIVE'),(6,'IN8D3F75K','H9146253','WORK','M',365,'EXPIRED');
/*!40000 ALTER TABLE `visas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-05 19:13:41
