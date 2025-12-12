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
	"go.uber.org/zap"

	"gobid/internal/dto"
	"gobid/internal/logger"
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

// SearchResult is a generic paginated response for search operations.
type SearchResult[T any] struct {
	Data   []T   `json:"data"`
	Total  int64 `json:"total"`
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

// CatmatSearchParams holds parameters for CATMAT FTS search.
type CatmatSearchParams struct {
	Query     string  `json:"q"`
	GroupCode *int16  `json:"group_code,omitempty"`
	ClassCode *int32  `json:"class_code,omitempty"`
	PdmCode   *int32  `json:"pdm_code,omitempty"`
	NcmCode   *string `json:"ncm_code,omitempty"`
	Limit     int32   `json:"limit"`
	Offset    int32   `json:"offset"`
}

// CatmatSearchItem represents a single CATMAT search result.
type CatmatSearchItem struct {
	ID              int64   `json:"id"`
	GroupCode       int16   `json:"group_code"`
	GroupName       string  `json:"group_name"`
	ClassCode       int32   `json:"class_code"`
	ClassName       string  `json:"class_name"`
	PdmCode         int32   `json:"pdm_code"`
	PdmName         string  `json:"pdm_name"`
	ItemCode        int32   `json:"item_code"`
	ItemDescription string  `json:"item_description"`
	NcmCode         *string `json:"ncm_code,omitempty"`
	Rank            float32 `json:"rank"`
}

// CatserSearchParams holds parameters for CATSER FTS search.
type CatserSearchParams struct {
	Query       string  `json:"q"`
	GroupCode   *int16  `json:"group_code,omitempty"`
	ClassCode   *int32  `json:"class_code,omitempty"`
	ServiceCode *int32  `json:"service_code,omitempty"`
	Status      *string `json:"status,omitempty"`
	Limit       int32   `json:"limit"`
	Offset      int32   `json:"offset"`
}

// CatserSearchItem represents a single CATSER search result.
type CatserSearchItem struct {
	ID                  int64   `json:"id"`
	MaterialServiceType string  `json:"material_service_type"`
	GroupCode           int16   `json:"group_code"`
	GroupName           string  `json:"group_name"`
	ClassCode           int32   `json:"class_code"`
	ClassName           string  `json:"class_name"`
	ServiceCode         int32   `json:"service_code"`
	ServiceDescription  string  `json:"service_description"`
	Status              string  `json:"status"`
	Rank                float32 `json:"rank"`
}

// CatalogImportService handles bulk imports for CATMAT and CATSER.
type CatalogImportService struct {
	pool    *pgxpool.Pool
	queries *pgstore.Queries
	log     *zap.Logger
}

func NewCatalogImportService(pool *pgxpool.Pool) CatalogImportService {
	return CatalogImportService{
		pool:    pool,
		queries: pgstore.New(pool),
		log:     logger.Log,
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
			s.log.Warn("catmat: erro lendo linha", zap.Int("row", rowNumber), zap.Error(err))
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
			s.log.Warn("catmat: linha ignorada", zap.Int("row", rowNumber), zap.String("reason", err.Error()))
			continue
		}

		if _, err := s.queries.UpsertCatmatItem(ctx, *params); err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: fmt.Sprintf("erro ao salvar: %v", err),
			})
			s.log.Error("catmat: erro ao salvar", zap.Int("row", rowNumber), zap.Error(err))
			continue
		}

		result.RowsSaved++
	}

	if err := rows.Error(); err != nil {
		return result, err
	}

	if !headerFound {
		s.log.Error("catmat: cabeçalho não encontrado")
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
			s.log.Warn("catser: erro lendo linha", zap.Int("row", rowNumber), zap.Error(err))
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
			s.log.Warn("catser: linha ignorada", zap.Int("row", rowNumber), zap.String("reason", err.Error()))
			continue
		}

		if _, err := s.queries.UpsertCatserItem(ctx, *params); err != nil {
			result.RowsSkipped++
			result.Errors = append(result.Errors, RowError{
				Row:    rowNumber,
				Reason: fmt.Sprintf("erro ao salvar: %v", err),
			})
			s.log.Error("catser: erro ao salvar", zap.Int("row", rowNumber), zap.Error(err))
			continue
		}

		result.RowsSaved++
	}

	if err := rows.Error(); err != nil {
		return result, err
	}

	if !headerFound {
		s.log.Error("catser: cabeçalho não encontrado")
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

// SearchCatmat performs full-text search on CATMAT items.
func (s *CatalogImportService) SearchCatmat(ctx context.Context, params CatmatSearchParams) (*SearchResult[CatmatSearchItem], error) {
	// Validate and set defaults
	limit := params.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	// Build query parameters
	var queryParam, ncmCodeParam *string
	var groupCodeParam *int16
	var classCodeParam, pdmCodeParam *int32

	if params.Query != "" {
		queryParam = &params.Query
	}
	if params.GroupCode != nil {
		groupCodeParam = params.GroupCode
	}
	if params.ClassCode != nil {
		classCodeParam = params.ClassCode
	}
	if params.PdmCode != nil {
		pdmCodeParam = params.PdmCode
	}
	if params.NcmCode != nil {
		ncmCodeParam = params.NcmCode
	}

	// Execute the search function
	rows, err := s.pool.Query(ctx, `
		SELECT id, group_code, group_name, class_code, class_name,
		       pdm_code, pdm_name, item_code, item_description, ncm_code, rank
		FROM catmat_search_fts($1, $2, $3, $4, $5, $6, $7)
	`, queryParam, groupCodeParam, classCodeParam, pdmCodeParam, ncmCodeParam, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search catmat: %w", err)
	}
	defer rows.Close()

	var items []CatmatSearchItem
	for rows.Next() {
		var item CatmatSearchItem
		var ncmCode *string
		if err := rows.Scan(
			&item.ID,
			&item.GroupCode,
			&item.GroupName,
			&item.ClassCode,
			&item.ClassName,
			&item.PdmCode,
			&item.PdmName,
			&item.ItemCode,
			&item.ItemDescription,
			&ncmCode,
			&item.Rank,
		); err != nil {
			return nil, fmt.Errorf("failed to scan catmat row: %w", err)
		}
		item.NcmCode = ncmCode
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating catmat rows: %w", err)
	}

	// Get total count for pagination
	var total int64
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM catmat_item
		WHERE ($1::text IS NULL OR search_document @@ websearch_to_tsquery('portuguese_unaccent', $1))
		  AND ($2::smallint IS NULL OR group_code = $2)
		  AND ($3::integer IS NULL OR class_code = $3)
		  AND ($4::integer IS NULL OR pdm_code = $4)
		  AND ($5::text IS NULL OR ncm_code = $5)
	`, queryParam, groupCodeParam, classCodeParam, pdmCodeParam, ncmCodeParam).Scan(&total)
	if err != nil {
		// If count fails, just use the items length
		total = int64(len(items))
	}

	return &SearchResult[CatmatSearchItem]{
		Data:   items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}

// SearchCatser performs full-text search on CATSER items.
func (s *CatalogImportService) SearchCatser(ctx context.Context, params CatserSearchParams) (*SearchResult[CatserSearchItem], error) {
	// Validate and set defaults
	limit := params.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	// Build query parameters
	var queryParam, statusParam *string
	var groupCodeParam *int16
	var classCodeParam, serviceCodeParam *int32

	if params.Query != "" {
		queryParam = &params.Query
	}
	if params.GroupCode != nil {
		groupCodeParam = params.GroupCode
	}
	if params.ClassCode != nil {
		classCodeParam = params.ClassCode
	}
	if params.ServiceCode != nil {
		serviceCodeParam = params.ServiceCode
	}
	if params.Status != nil {
		statusParam = params.Status
	}

	// Execute the search function
	rows, err := s.pool.Query(ctx, `
		SELECT id, material_service_type, group_code, group_name, class_code,
		       class_name, service_code, service_description, status, rank
		FROM catser_search_fts($1, $2, $3, $4, $5, $6, $7)
	`, queryParam, groupCodeParam, classCodeParam, serviceCodeParam, statusParam, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search catser: %w", err)
	}
	defer rows.Close()

	var items []CatserSearchItem
	for rows.Next() {
		var item CatserSearchItem
		if err := rows.Scan(
			&item.ID,
			&item.MaterialServiceType,
			&item.GroupCode,
			&item.GroupName,
			&item.ClassCode,
			&item.ClassName,
			&item.ServiceCode,
			&item.ServiceDescription,
			&item.Status,
			&item.Rank,
		); err != nil {
			return nil, fmt.Errorf("failed to scan catser row: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating catser rows: %w", err)
	}

	// Get total count for pagination
	var total int64
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM catser_item
		WHERE ($1::text IS NULL OR search_document @@ websearch_to_tsquery('portuguese_unaccent', $1))
		  AND ($2::smallint IS NULL OR group_code = $2)
		  AND ($3::integer IS NULL OR class_code = $3)
		  AND ($4::integer IS NULL OR service_code = $4)
		  AND ($5::text IS NULL OR status = $5)
	`, queryParam, groupCodeParam, classCodeParam, serviceCodeParam, statusParam).Scan(&total)
	if err != nil {
		// If count fails, just use the items length
		total = int64(len(items))
	}

	return &SearchResult[CatserSearchItem]{
		Data:   items,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}, nil
}

// GetCatalogStats returns statistics for both CATMAT and CATSER catalogs.
func (s *CatalogImportService) GetCatalogStats(ctx context.Context) (*dto.CatalogStatsResponse, error) {
	response := &dto.CatalogStatsResponse{
		CatmatByGroup:  []dto.GroupCount{},
		CatserByGroup:  []dto.GroupCount{},
		CatserByStatus: []dto.StatusCount{},
	}

	// Get CATMAT total count
	if err := s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM catmat_item").Scan(&response.CatmatTotal); err != nil {
		s.log.Error("failed to get catmat count", zap.Error(err))
		response.CatmatTotal = 0
	}

	// Get CATSER total count
	if err := s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM catser_item").Scan(&response.CatserTotal); err != nil {
		s.log.Error("failed to get catser count", zap.Error(err))
		response.CatserTotal = 0
	}

	// Get CATMAT items by group (top 10)
	catmatGroupRows, err := s.pool.Query(ctx, `
		SELECT group_code, group_name, COUNT(*) as count
		FROM catmat_item
		GROUP BY group_code, group_name
		ORDER BY count DESC
		LIMIT 10
	`)
	if err != nil {
		s.log.Error("failed to get catmat by group", zap.Error(err))
	} else {
		defer catmatGroupRows.Close()
		for catmatGroupRows.Next() {
			var gc dto.GroupCount
			if err := catmatGroupRows.Scan(&gc.GroupCode, &gc.GroupName, &gc.Count); err != nil {
				s.log.Error("failed to scan catmat group row", zap.Error(err))
				continue
			}
			response.CatmatByGroup = append(response.CatmatByGroup, gc)
		}
	}

	// Get CATSER items by group (top 10)
	catserGroupRows, err := s.pool.Query(ctx, `
		SELECT group_code, group_name, COUNT(*) as count
		FROM catser_item
		GROUP BY group_code, group_name
		ORDER BY count DESC
		LIMIT 10
	`)
	if err != nil {
		s.log.Error("failed to get catser by group", zap.Error(err))
	} else {
		defer catserGroupRows.Close()
		for catserGroupRows.Next() {
			var gc dto.GroupCount
			if err := catserGroupRows.Scan(&gc.GroupCode, &gc.GroupName, &gc.Count); err != nil {
				s.log.Error("failed to scan catser group row", zap.Error(err))
				continue
			}
			response.CatserByGroup = append(response.CatserByGroup, gc)
		}
	}

	// Get CATSER items by status
	catserStatusRows, err := s.pool.Query(ctx, `
		SELECT status, COUNT(*) as count
		FROM catser_item
		GROUP BY status
		ORDER BY status
	`)
	if err != nil {
		s.log.Error("failed to get catser by status", zap.Error(err))
	} else {
		defer catserStatusRows.Close()
		for catserStatusRows.Next() {
			var sc dto.StatusCount
			if err := catserStatusRows.Scan(&sc.Status, &sc.Count); err != nil {
				s.log.Error("failed to scan catser status row", zap.Error(err))
				continue
			}
			response.CatserByStatus = append(response.CatserByStatus, sc)
		}
	}

	return response, nil
}
