package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xuri/excelize/v2"

	"gobid/internal/store/pgstore"
)

// ImportResult summarizes the outcome of an import operation.
type ImportResult struct {
	RowsRead    int        `json:"rows_read"`
	RowsSaved   int        `json:"rows_saved"`
	RowsSkipped int        `json:"rows_skipped"`
	Errors      []RowError `json:"errors,omitempty"`
}

// RowError captures a single row failure during import.
type RowError struct {
	Row    int    `json:"row"`
	Reason string `json:"reason"`
}

// CatalogImportService handles bulk imports for CATMAT and CATSER.
type CatalogImportService struct {
	pool    *pgxpool.Pool
	queries *pgstore.Queries
}

func NewCatalogImportService(pool *pgxpool.Pool) CatalogImportService {
	return CatalogImportService{
		pool:    pool,
		queries: pgstore.New(pool),
	}
}

func (s *CatalogImportService) ImportCatmat(ctx context.Context, reader io.Reader) (*ImportResult, error) {
	f, err := openExcelFromReader(reader)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	if sheetName == "" {
		return nil, fmt.Errorf("planilha vazia ou sem abas")
	}

	rows, err := f.Rows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("falha ao ler linhas da planilha: %w", err)
	}
	defer rows.Close()

	result := &ImportResult{}
	headerFound := false
	rowNumber := 0

	for rows.Next() {
		rowNumber++

		cells, err := rows.Columns()
		if err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: fmt.Sprintf("erro lendo linha: %v", err),
			})
			continue
		}

		if !headerFound {
			if isCatmatHeader(cells) {
				headerFound = true
			}
			continue
		}

		if isRowEmpty(cells) {
			continue
		}

		result.RowsRead++

		params, err := buildCatmatParams(cells)
		if err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: err.Error(),
			})
			continue
		}

		if _, err := s.queries.UpsertCatmatItem(ctx, *params); err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: fmt.Sprintf("erro ao salvar: %v", err),
			})
			continue
		}

		result.RowsSaved++
	}

	if err := rows.Error(); err != nil {
		return result, err
	}

	if !headerFound {
		return result, fmt.Errorf("cabeçalho CATMAT não encontrado")
	}

	return result, nil
}

func (s *CatalogImportService) ImportCatser(ctx context.Context, reader io.Reader) (*ImportResult, error) {
	f, err := openExcelFromReader(reader)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	if sheetName == "" {
		return nil, fmt.Errorf("planilha vazia ou sem abas")
	}

	rows, err := f.Rows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("falha ao ler linhas da planilha: %w", err)
	}
	defer rows.Close()

	result := &ImportResult{}
	headerFound := false
	rowNumber := 0

	for rows.Next() {
		rowNumber++

		cells, err := rows.Columns()
		if err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: fmt.Sprintf("erro lendo linha: %v", err),
			})
			continue
		}

		if !headerFound {
			if isCatserHeader(cells) {
				headerFound = true
			}
			continue
		}

		if isRowEmpty(cells) {
			continue
		}

		result.RowsRead++

		params, err := buildCatserParams(cells)
		if err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: err.Error(),
			})
			continue
		}

		if _, err := s.queries.UpsertCatserItem(ctx, *params); err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: fmt.Sprintf("erro ao salvar: %v", err),
			})
			continue
		}

		result.RowsSaved++
	}

	if err := rows.Error(); err != nil {
		return result, err
	}

	if !headerFound {
		return result, fmt.Errorf("cabeçalho CATSER não encontrado")
	}

	return result, nil
}

func openExcelFromReader(reader io.Reader) (*excelize.File, error) {
	buf, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("falha ao ler arquivo: %w", err)
	}

	file, err := excelize.OpenReader(bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("arquivo XLSX inválido: %w", err)
	}

	return file, nil
}

func isRowEmpty(cells []string) bool {
	for _, c := range cells {
		if strings.TrimSpace(c) != "" {
			return false
		}
	}
	return true
}

func normalizeHeader(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func isCatmatHeader(cells []string) bool {
	expected := []string{
		"código do grupo",
		"nome do grupo",
		"código da classe",
		"nome da classe",
		"código do pdm",
		"nome do pdm",
		"código do item",
		"descrição do item",
		"código ncm",
	}

	if len(cells) < len(expected) {
		return false
	}

	for i, exp := range expected {
		if normalizeHeader(cells[i]) != exp {
			return false
		}
	}

	return true
}

func isCatserHeader(cells []string) bool {
	if len(cells) < 8 {
		return false
	}

	return strings.Contains(normalizeHeader(cells[0]), "tipo material") &&
		strings.Contains(normalizeHeader(cells[1]), "grupo serviço") &&
		strings.Contains(normalizeHeader(cells[3]), "classe material") &&
		strings.Contains(normalizeHeader(cells[5]), "codigo material") &&
		strings.Contains(normalizeHeader(cells[7]), "sit atual")
}

func buildCatmatParams(cells []string) (*pgstore.UpsertCatmatItemParams, error) {
	const (
		groupCodeIdx       = 0
		groupNameIdx       = 1
		classCodeIdx       = 2
		classNameIdx       = 3
		pdmCodeIdx         = 4
		pdmNameIdx         = 5
		itemCodeIdx        = 6
		itemDescriptionIdx = 7
		ncmCodeIdx         = 8
	)

	groupCode, err := parseInt16(getCell(cells, groupCodeIdx), "código do grupo")
	if err != nil {
		return nil, err
	}

	classCode, err := parseInt32(getCell(cells, classCodeIdx), "código da classe")
	if err != nil {
		return nil, err
	}

	pdmCode, err := parseInt32(getCell(cells, pdmCodeIdx), "código do pdm")
	if err != nil {
		return nil, err
	}

	itemCode, err := parseInt32(getCell(cells, itemCodeIdx), "código do item")
	if err != nil {
		return nil, err
	}

	groupName := strings.TrimSpace(getCell(cells, groupNameIdx))
	className := strings.TrimSpace(getCell(cells, classNameIdx))
	pdmName := strings.TrimSpace(getCell(cells, pdmNameIdx))
	itemDescription := strings.TrimSpace(getCell(cells, itemDescriptionIdx))

	if groupName == "" || className == "" || pdmName == "" || itemDescription == "" {
		return nil, fmt.Errorf("campos obrigatórios ausentes na linha")
	}

	ncm := strings.TrimSpace(getCell(cells, ncmCodeIdx))
	var ncmCode pgtype.Text
	if ncm != "" && ncm != "-" {
		ncmCode = pgtype.Text{String: ncm, Valid: true}
	}

	return &pgstore.UpsertCatmatItemParams{
		GroupCode:       groupCode,
		GroupName:       groupName,
		ClassCode:       classCode,
		ClassName:       className,
		PdmCode:         pdmCode,
		PdmName:         pdmName,
		ItemCode:        itemCode,
		ItemDescription: itemDescription,
		NcmCode:         ncmCode,
	}, nil
}

func buildCatserParams(cells []string) (*pgstore.UpsertCatserItemParams, error) {
	const (
		materialServiceTypeIdx = 0
		groupCodeIdx           = 1
		groupNameIdx           = 2
		classCodeIdx           = 3
		classNameIdx           = 4
		serviceCodeIdx         = 5
		serviceDescriptionIdx  = 6
		statusIdx              = 7
	)

	groupCode, err := parseInt16(getCell(cells, groupCodeIdx), "grupo serviço")
	if err != nil {
		return nil, err
	}

	classCode, err := parseInt32(getCell(cells, classCodeIdx), "classe material")
	if err != nil {
		return nil, err
	}

	serviceCode, err := parseInt32(getCell(cells, serviceCodeIdx), "código material serviço")
	if err != nil {
		return nil, err
	}

	materialType := strings.TrimSpace(getCell(cells, materialServiceTypeIdx))
	groupName := strings.TrimSpace(getCell(cells, groupNameIdx))
	className := strings.TrimSpace(getCell(cells, classNameIdx))
	serviceDescription := strings.TrimSpace(getCell(cells, serviceDescriptionIdx))
	status := strings.TrimSpace(getCell(cells, statusIdx))

	if materialType == "" || groupName == "" || className == "" || serviceDescription == "" || status == "" {
		return nil, fmt.Errorf("campos obrigatórios ausentes na linha")
	}

	return &pgstore.UpsertCatserItemParams{
		MaterialServiceType: materialType,
		GroupCode:           groupCode,
		GroupName:           groupName,
		ClassCode:           classCode,
		ClassName:           className,
		ServiceCode:         serviceCode,
		ServiceDescription:  serviceDescription,
		Status:              status,
	}, nil
}

func parseInt16(value string, field string) (int16, error) {
	parsed, err := parseInt(value, field, 16)
	if err != nil {
		return 0, err
	}
	return int16(parsed), nil
}

func parseInt32(value string, field string) (int32, error) {
	parsed, err := parseInt(value, field, 32)
	if err != nil {
		return 0, err
	}
	return int32(parsed), nil
}

func parseInt(value string, field string, bitSize int) (int64, error) {
	clean := strings.TrimSpace(value)
	clean = strings.TrimPrefix(clean, "'")
	clean = strings.ReplaceAll(clean, " ", "")
	clean = strings.ReplaceAll(clean, "\u00a0", "")

	if clean == "" || clean == "-" {
		return 0, fmt.Errorf("%s vazio", field)
	}

	if strings.Contains(clean, ".") {
		if floatVal, err := strconv.ParseFloat(clean, 64); err == nil {
			return int64(floatVal), nil
		}
	}

	parsed, err := strconv.ParseInt(clean, 10, bitSize)
	if err != nil {
		return 0, fmt.Errorf("%s inválido: %w", field, err)
	}

	return parsed, nil
}

func getCell(cells []string, idx int) string {
	if idx < len(cells) {
		return cells[idx]
	}
	return ""
}
