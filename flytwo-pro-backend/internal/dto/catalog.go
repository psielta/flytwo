package dto

// CatmatSearchResponse represents the paginated response for CATMAT search
type CatmatSearchResponse struct {
	Data   []CatmatSearchItem `json:"data"`
	Total  int64              `json:"total"`
	Limit  int32              `json:"limit"`
	Offset int32              `json:"offset"`
}

// CatmatSearchItem represents a single CATMAT search result item
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

// CatserSearchResponse represents the paginated response for CATSER search
type CatserSearchResponse struct {
	Data   []CatserSearchItem `json:"data"`
	Total  int64              `json:"total"`
	Limit  int32              `json:"limit"`
	Offset int32              `json:"offset"`
}

// CatserSearchItem represents a single CATSER search result item
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
